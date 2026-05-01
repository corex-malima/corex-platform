import crypto from "node:crypto";
import type { PoolClient } from "pg";

import { queryAdmin, withAdminTransaction } from "@/lib/admin-db";

export type AdminGoalTarget = {
  targetCode: string;
  targetName: string;
  targetDescription: string | null;
  parentTargetCode: string | null;
  levelIndex: number;
  levelLabel: string | null;
  metricCode: string | null;
  metricName: string | null;
  unitCode: string | null;
  unitSymbol: string | null;
  operatorCode: string | null;
  operatorLabel: string | null;
  valueMin: number | null;
  valueMax: number | null;
  valueText: string | null;
  notesText: string | null;
  domainCodes: string[];
  typeItemCodes: string[];
  validFrom: string;
  validTo: string | null;
  actorId: string | null;
  changeReason: string;
};

export type AdminGoalTargetHistoryEntry = AdminGoalTarget & {
  recordId: string;
  isCurrent: boolean;
  isValid: boolean;
  loadedAt: string;
};

type TargetRow = {
  target_code: string;
  target_name: string;
  target_description: string | null;
  parent_target_code: string | null;
  level_index: number | string;
  level_label: string | null;
  metric_code: string | null;
  metric_name: string | null;
  unit_code: string | null;
  unit_symbol: string | null;
  operator_code: string | null;
  operator_label: string | null;
  value_min: string | number | null;
  value_max: string | number | null;
  value_text: string | null;
  notes_text: string | null;
  valid_from: Date | string;
  valid_to: Date | string | null;
  actor_id: string | null;
  change_reason: string;
  domain_code?: string | null;
};

type DomainBridgeRow = { target_code: string; domain_code: string };
type TypeBridgeRow = { target_code: string; type_item_code: string };

const CORE_TABLE = "public.adm_ref_goal_target_id_core_scd2";
const PROFILE_TABLE = "public.adm_dim_goal_target_profile_scd2";
const METRIC_PROFILE_TABLE = "public.adm_dim_metric_profile_scd2";
const UNIT_PROFILE_TABLE = "public.adm_dim_unit_of_measure_profile_scd2";
const ITEM_PROFILE_TABLE = "public.adm_dim_catalog_item_profile_scd2";
const RUN_ID = "corex_admin_goals";

function toIso(v: Date | string): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function toIsoOrNull(v: Date | string | null): string | null {
  return v === null ? null : toIso(v);
}

function toNumberOrNull(v: string | number | null): number | null {
  if (v === null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapRow(
  r: TargetRow,
  domainsByTarget: Map<string, string[]>,
  typesByTarget: Map<string, string[]>,
): AdminGoalTarget {
  return {
    targetCode: r.target_code,
    targetName: r.target_name,
    targetDescription: r.target_description,
    parentTargetCode: r.parent_target_code,
    levelIndex: Number(r.level_index),
    levelLabel: r.level_label,
    metricCode: r.metric_code,
    metricName: r.metric_name,
    unitCode: r.unit_code,
    unitSymbol: r.unit_symbol,
    operatorCode: r.operator_code,
    operatorLabel: r.operator_label,
    valueMin: toNumberOrNull(r.value_min),
    valueMax: toNumberOrNull(r.value_max),
    valueText: r.value_text,
    notesText: r.notes_text,
    domainCodes: (() => {
      const fromBridge = domainsByTarget.get(r.target_code) ?? [];
      if (fromBridge.length > 0) return fromBridge;
      return r.domain_code ? [r.domain_code] : [];
    })(),
    typeItemCodes: typesByTarget.get(r.target_code) ?? [],
    validFrom: toIso(r.valid_from),
    validTo: toIsoOrNull(r.valid_to),
    actorId: r.actor_id,
    changeReason: r.change_reason,
  };
}

export async function listActiveGoalTargets(): Promise<AdminGoalTarget[]> {
  try {
    const [targets, domains, types] = await Promise.all([
      queryAdmin<TargetRow>(
        `SELECT * FROM public.vw_adm_goal_target_active ORDER BY level_index, target_code`,
      ),
      queryAdmin<DomainBridgeRow>(
        `SELECT target_code, domain_code FROM public.adm_asgn_goal_target_domain_scd2
         WHERE is_current = true AND is_valid = true`,
      ),
      queryAdmin<TypeBridgeRow>(
        `SELECT target_code, type_item_code FROM public.adm_asgn_goal_target_type_scd2
         WHERE is_current = true AND is_valid = true`,
      ),
    ]);

    const domainsByTarget = new Map<string, string[]>();
    domains.rows.forEach((r) => {
      const list = domainsByTarget.get(r.target_code) ?? [];
      list.push(r.domain_code);
      domainsByTarget.set(r.target_code, list);
    });

    const typesByTarget = new Map<string, string[]>();
    types.rows.forEach((r) => {
      const list = typesByTarget.get(r.target_code) ?? [];
      list.push(r.type_item_code);
      typesByTarget.set(r.target_code, list);
    });

    return targets.rows.map((r) => mapRow(r, domainsByTarget, typesByTarget));
  } catch {
    return [];
  }
}

export async function listGoalTargetHistory(targetCode: string): Promise<AdminGoalTargetHistoryEntry[]> {
  const result = await queryAdmin<TargetRow & { record_id: string; is_current: boolean; is_valid: boolean; loaded_at: Date | string }>(
    `SELECT t.target_code, t.target_name, t.target_description, t.parent_target_code,
            t.level_index, t.level_label, t.metric_code,
            m.metric_name, m.unit_code, u.unit_symbol,
            t.operator_code, op.item_label_es AS operator_label,
            t.value_min, t.value_max, t.value_text, t.notes_text,
            t.valid_from, t.valid_to,
            t.record_id, t.is_current, t.is_valid, t.loaded_at,
            t.actor_id, t.change_reason
     FROM ${PROFILE_TABLE} t
     LEFT JOIN ${METRIC_PROFILE_TABLE} m
       ON m.metric_code = t.metric_code AND m.is_current AND m.is_valid
     LEFT JOIN ${UNIT_PROFILE_TABLE} u
       ON u.unit_code = m.unit_code AND u.is_current AND u.is_valid
     LEFT JOIN ${ITEM_PROFILE_TABLE} op
       ON op.catalog_code = 'comparison_operators' AND op.item_code = t.operator_code
       AND op.is_current AND op.is_valid
     WHERE t.target_code = $1
     ORDER BY t.valid_from DESC, t.loaded_at DESC`,
    [targetCode],
  );
  return result.rows.map((r) => ({
    ...mapRow(r, new Map(), new Map()),
    recordId: r.record_id,
    isCurrent: r.is_current,
    isValid: r.is_valid,
    loadedAt: toIso(r.loaded_at),
  }));
}

export type UpsertGoalTargetInput = {
  targetCode: string;
  targetName: string;
  targetDescription?: string | null;
  parentTargetCode?: string | null;
  levelIndex: number;
  levelLabel?: string | null;
  metricCode?: string | null;
  operatorCode?: string | null;
  valueMin?: number | null;
  valueMax?: number | null;
  valueText?: string | null;
  notesText?: string | null;
  domainCodes?: string[];
  typeItemCodes?: string[];
  validFromDate: string;
  actorId?: string;
  changeReason?: string;
};

async function insertBridges(
  client: PoolClient,
  targetCode: string,
  validFromIso: string,
  domainCodes: string[],
  typeItemCodes: string[],
  actorId: string | null,
  changeReason: string,
): Promise<void> {
  for (const dc of domainCodes) {
    await client.query(
      `INSERT INTO public.adm_asgn_goal_target_domain_scd2
        (target_code, domain_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3::timestamptz, true, true, $4, $5, $6)`,
      [targetCode, dc, validFromIso, RUN_ID, actorId, changeReason],
    );
  }
  for (const ti of typeItemCodes) {
    await client.query(
      `INSERT INTO public.adm_asgn_goal_target_type_scd2
        (target_code, type_item_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3::timestamptz, true, true, $4, $5, $6)`,
      [targetCode, ti, validFromIso, RUN_ID, actorId, changeReason],
    );
  }
}

async function closeBridges(
  client: PoolClient,
  targetCode: string,
  closeAtIso: string,
  actorId: string | null,
  changeReason: string,
): Promise<void> {
  await client.query(
    `UPDATE public.adm_asgn_goal_target_domain_scd2
     SET is_current = false, valid_to = $2::timestamptz, loaded_at = now(),
         actor_id = $3, change_reason = $4
     WHERE target_code = $1 AND is_current = true AND is_valid = true`,
    [targetCode, closeAtIso, actorId, changeReason],
  );
  await client.query(
    `UPDATE public.adm_asgn_goal_target_type_scd2
     SET is_current = false, valid_to = $2::timestamptz, loaded_at = now(),
         actor_id = $3, change_reason = $4
     WHERE target_code = $1 AND is_current = true AND is_valid = true`,
    [targetCode, closeAtIso, actorId, changeReason],
  );
}

export async function createGoalTarget(input: UpsertGoalTargetInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    const validFromIso = `${input.validFromDate}T00:00:00Z`;
    const actor = input.actorId ?? null;
    const reason = input.changeReason ?? "manual_create";

    await client.query(
      `INSERT INTO ${CORE_TABLE}
        (record_id, target_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3::timestamptz, true, true, $4, $5, $6)`,
      [crypto.randomUUID(), input.targetCode, validFromIso, RUN_ID, actor, reason],
    );
    await client.query(
      `INSERT INTO ${PROFILE_TABLE}
        (record_id, target_code, target_name, target_description, parent_target_code,
         level_index, level_label, metric_code, operator_code,
         value_min, value_max, value_text, notes_text, domain_code,
         valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15::timestamptz, true, true, $16, $17, $18)`,
      [
        crypto.randomUUID(),
        input.targetCode,
        input.targetName,
        input.targetDescription ?? null,
        input.parentTargetCode ?? null,
        input.levelIndex,
        input.levelLabel ?? null,
        input.metricCode ?? null,
        input.operatorCode ?? null,
        input.valueMin ?? null,
        input.valueMax ?? null,
        input.valueText ?? null,
        input.notesText ?? null,
        (input.domainCodes ?? [])[0] ?? null,
        validFromIso,
        RUN_ID,
        actor,
        reason,
      ],
    );

    await insertBridges(client, input.targetCode, validFromIso, input.domainCodes ?? [], input.typeItemCodes ?? [], actor, reason);
  });
}

export async function updateGoalTarget(input: UpsertGoalTargetInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    const newValidFromIso = `${input.validFromDate}T00:00:00Z`;
    const newDate = new Date(newValidFromIso);
    const closeDate = new Date(newDate.getTime() - 1);
    const closeIso = closeDate.toISOString();
    const actor = input.actorId ?? null;
    const reason = input.changeReason ?? "manual_update";

    const current = await client.query<{ valid_from: Date }>(
      `SELECT valid_from FROM ${PROFILE_TABLE}
       WHERE target_code = $1 AND is_current = true AND is_valid = true LIMIT 1`,
      [input.targetCode],
    );

    if (current.rowCount === 0) {
      throw new Error(`No existe meta activa con codigo ${input.targetCode}`);
    }

    const currentValidFrom = current.rows[0].valid_from;
    if (currentValidFrom && new Date(newValidFromIso) <= new Date(currentValidFrom)) {
      throw new Error(
        `Nueva fecha de inicio (${input.validFromDate}) debe ser posterior a la version vigente`,
      );
    }

    await client.query(
      `UPDATE ${CORE_TABLE}
       SET is_current = false, valid_to = $2::timestamptz, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE target_code = $1 AND is_current = true AND is_valid = true`,
      [input.targetCode, closeIso, actor, reason],
    );
    await client.query(
      `UPDATE ${PROFILE_TABLE}
       SET is_current = false, valid_to = $2::timestamptz, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE target_code = $1 AND is_current = true AND is_valid = true`,
      [input.targetCode, closeIso, actor, reason],
    );

    await closeBridges(client, input.targetCode, closeIso, actor, reason);

    await client.query(
      `INSERT INTO ${CORE_TABLE}
        (record_id, target_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3::timestamptz, true, true, $4, $5, $6)`,
      [crypto.randomUUID(), input.targetCode, newValidFromIso, RUN_ID, actor, reason],
    );
    await client.query(
      `INSERT INTO ${PROFILE_TABLE}
        (record_id, target_code, target_name, target_description, parent_target_code,
         level_index, level_label, metric_code, operator_code,
         value_min, value_max, value_text, notes_text, domain_code,
         valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
               $15::timestamptz, true, true, $16, $17, $18)`,
      [
        crypto.randomUUID(),
        input.targetCode,
        input.targetName,
        input.targetDescription ?? null,
        input.parentTargetCode ?? null,
        input.levelIndex,
        input.levelLabel ?? null,
        input.metricCode ?? null,
        input.operatorCode ?? null,
        input.valueMin ?? null,
        input.valueMax ?? null,
        input.valueText ?? null,
        input.notesText ?? null,
        (input.domainCodes ?? [])[0] ?? null,
        newValidFromIso,
        RUN_ID,
        actor,
        reason,
      ],
    );

    await insertBridges(client, input.targetCode, newValidFromIso, input.domainCodes ?? [], input.typeItemCodes ?? [], actor, reason);
  });
}

export async function setGoalTargetValidity(
  targetCode: string,
  isValid: boolean,
  actorId: string | null,
  changeReason: string = "manual_update",
): Promise<void> {
  await withAdminTransaction(async (client) => {
    await client.query(
      `UPDATE ${CORE_TABLE}
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE target_code = $1 AND is_current = true`,
      [targetCode, isValid, actorId, changeReason],
    );
    await client.query(
      `UPDATE ${PROFILE_TABLE}
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE target_code = $1 AND is_current = true`,
      [targetCode, isValid, actorId, changeReason],
    );
  });
}
