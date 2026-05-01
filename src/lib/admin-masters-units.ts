import crypto from "node:crypto";

import { queryAdmin, withAdminTransaction } from "@/lib/admin-db";

export type AdminUnit = {
  unitCode: string;
  unitName: string;
  unitSymbol: string | null;
  unitCategoryCode: string | null;
  notesText: string | null;
  validFrom: string;
  validTo: string | null;
  actorId: string | null;
  changeReason: string;
};

export type AdminUnitHistoryEntry = AdminUnit & {
  recordId: string;
  isCurrent: boolean;
  isValid: boolean;
  loadedAt: string;
};

type UnitRow = {
  record_id: string;
  unit_code: string;
  unit_name: string;
  unit_symbol: string | null;
  unit_category_code: string | null;
  notes_text: string | null;
  valid_from: Date | string;
  valid_to: Date | string | null;
  is_current: boolean;
  is_valid: boolean;
  loaded_at: Date | string;
  actor_id: string | null;
  change_reason: string;
};

const CORE_TABLE = "public.adm_ref_unit_of_measure_id_core_scd2";
const PROFILE_TABLE = "public.adm_dim_unit_of_measure_profile_scd2";
const RUN_ID = "corex_admin_units";

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIso(value);
}

function mapRow(r: UnitRow): AdminUnit {
  return {
    unitCode: r.unit_code,
    unitName: r.unit_name,
    unitSymbol: r.unit_symbol,
    unitCategoryCode: r.unit_category_code,
    notesText: r.notes_text,
    validFrom: toIso(r.valid_from),
    validTo: toIsoOrNull(r.valid_to),
    actorId: r.actor_id,
    changeReason: r.change_reason,
  };
}

export async function listActiveUnits(): Promise<AdminUnit[]> {
  try {
    const result = await queryAdmin<UnitRow>(
      `SELECT record_id, unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
              valid_from, valid_to, is_current, is_valid, loaded_at, actor_id, change_reason
       FROM ${PROFILE_TABLE}
       WHERE is_current = true AND is_valid = true
       ORDER BY unit_category_code NULLS LAST, unit_code`,
    );
    return result.rows.map(mapRow);
  } catch {
    return [];
  }
}

export async function listUnitHistory(unitCode: string): Promise<AdminUnitHistoryEntry[]> {
  const result = await queryAdmin<UnitRow>(
    `SELECT record_id, unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
            valid_from, valid_to, is_current, is_valid, loaded_at, actor_id, change_reason
     FROM ${PROFILE_TABLE}
     WHERE unit_code = $1
     ORDER BY valid_from DESC, loaded_at DESC`,
    [unitCode],
  );
  return result.rows.map((r) => ({
    ...mapRow(r),
    recordId: r.record_id,
    isCurrent: r.is_current,
    isValid: r.is_valid,
    loadedAt: toIso(r.loaded_at),
  }));
}

export type UpsertUnitInput = {
  unitCode: string;
  unitName: string;
  unitSymbol?: string | null;
  unitCategoryCode?: string | null;
  notesText?: string | null;
  actorId?: string;
  changeReason?: string;
};

export async function createUnit(input: UpsertUnitInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    const actor = input.actorId ?? null;
    const reason = input.changeReason ?? "manual_create";

    await client.query(
      `INSERT INTO ${CORE_TABLE}
        (record_id, unit_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, now(), true, true, $3, $4, $5)`,
      [crypto.randomUUID(), input.unitCode, RUN_ID, actor, reason],
    );
    await client.query(
      `INSERT INTO ${PROFILE_TABLE}
        (record_id, unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
         valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, now(), true, true, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        input.unitCode,
        input.unitName,
        input.unitSymbol ?? null,
        input.unitCategoryCode ?? null,
        input.notesText ?? null,
        RUN_ID,
        actor,
        reason,
      ],
    );
  });
}

export async function updateUnit(input: UpsertUnitInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    const actor = input.actorId ?? null;
    const reason = input.changeReason ?? "manual_update";

    await client.query(
      `UPDATE ${CORE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $2, change_reason = $3
       WHERE unit_code = $1 AND is_current = true AND is_valid = true`,
      [input.unitCode, actor, reason],
    );
    await client.query(
      `UPDATE ${PROFILE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $2, change_reason = $3
       WHERE unit_code = $1 AND is_current = true AND is_valid = true`,
      [input.unitCode, actor, reason],
    );

    await client.query(
      `INSERT INTO ${CORE_TABLE}
        (record_id, unit_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, now(), true, true, $3, $4, $5)`,
      [crypto.randomUUID(), input.unitCode, RUN_ID, actor, reason],
    );
    await client.query(
      `INSERT INTO ${PROFILE_TABLE}
        (record_id, unit_code, unit_name, unit_symbol, unit_category_code, notes_text,
         valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, now(), true, true, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        input.unitCode,
        input.unitName,
        input.unitSymbol ?? null,
        input.unitCategoryCode ?? null,
        input.notesText ?? null,
        RUN_ID,
        actor,
        reason,
      ],
    );
  });
}

export async function setUnitValidity(
  unitCode: string,
  isValid: boolean,
  actorId: string | null,
  changeReason: string = "manual_update",
): Promise<void> {
  await withAdminTransaction(async (client) => {
    await client.query(
      `UPDATE ${CORE_TABLE}
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE unit_code = $1 AND is_current = true`,
      [unitCode, isValid, actorId, changeReason],
    );
    await client.query(
      `UPDATE ${PROFILE_TABLE}
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE unit_code = $1 AND is_current = true`,
      [unitCode, isValid, actorId, changeReason],
    );
  });
}
