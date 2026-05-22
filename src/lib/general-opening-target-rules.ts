import crypto from "crypto";
import type { PoolClient } from "pg";

import { listCurrentGeneralSimpleMasterRecords } from "@/lib/general-masters";
import { queryGeneral, withGeneralTransaction } from "@/lib/general-db";
import {
  getOpeningPointCategoryDefinitionByCode,
  inferOpeningPointCategoryDefinitionByRange,
} from "@/lib/opening-point-categories";

export type GeneralOpeningTargetRuleInput = {
  code: string;
  name: string;
  validFrom: string;
  openingPointCategoryId: string;
  varietyId?: string | null;
  notes?: string | null;
  isActive: boolean;
  changeReason?: string | null;
};

export type GeneralOpeningTargetRuleRecord = {
  ruleId: string;
  code: string;
  name: string;
  validFrom: string;
  validTo: string | null;
  openingPointCategoryId: string | null;
  openingPointCategoryCode: string | null;
  openingPointCategoryName: string | null;
  targetClassMin: number;
  targetClassMax: number;
  varietyId: string | null;
  varietyName: string | null;
  scopeLabel: string;
  notes: string | null;
  isActive: boolean;
  loadedAt: string | null;
  runId: string | null;
  actorId: string | null;
  changeReason: string | null;
};

export type GeneralOpeningTargetRuleOption = {
  value: string;
  label: string;
  meta?: string | null;
};

export type GeneralOpeningTargetRuleModuleData = {
  rules: GeneralOpeningTargetRuleRecord[];
  options: {
    openingPoints: GeneralOpeningTargetRuleOption[];
    varieties: GeneralOpeningTargetRuleOption[];
  };
  summary: {
    totalRules: number;
    activeRules: number;
    generalRules: number;
    scopedRules: number;
  };
  notes: string[];
};

type OpeningTargetRuleRow = {
  rule_id: string;
  rule_code: string;
  rule_name: string;
  valid_from: string;
  valid_to: string | null;
  opening_point_category_id: string | null;
  opening_point_category_code: string | null;
  opening_point_category_name: string | null;
  target_class_min: number | string;
  target_class_max: number | string;
  variety_id: string | null;
  farm_id: string | null;
  notes_text: string | null;
  is_active: boolean | null;
  loaded_at: string | null;
  run_id: string | null;
  actor_id: string | null;
  change_reason: string | null;
};

const RULE_REF_TABLE = "public.gnl_ref_opening_target_rule_id_core_scd2";
const RULE_DIM_TABLE = "public.gnl_dim_opening_target_rule_profile_scd2";

declare global {
  var __dashboardGeneralOpeningTargetRulesSetup: Promise<void> | undefined;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCode(value: string) {
  return normalizeText(value).toUpperCase();
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = normalizeText(value ?? "");
  return normalized || null;
}

function makeRecordId() {
  return crypto.randomUUID();
}

function makeRuleId() {
  return `gopen_${crypto.randomUUID()}`;
}

function makeRunId(prefix: string) {
  return `${prefix}_${new Date().toISOString()}`;
}

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toISOString() : null;
}

function toDateOnly(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function coerceBoolean(value: boolean | null | undefined, fallback = true) {
  return value ?? fallback;
}

function parseDateStart(value: string) {
  const normalized = normalizeText(value);
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    throw new Error("La fecha de vigencia no tiene un formato valido.");
  }
  return date;
}

function sanitizeInput(input: GeneralOpeningTargetRuleInput) {
  const code = normalizeCode(input.code);
  const name = normalizeText(input.name);
  const validFrom = normalizeText(input.validFrom);
  const notes = normalizeOptionalText(input.notes);
  const changeReason = normalizeOptionalText(input.changeReason);
  const openingPointCategoryId = normalizeOptionalText(input.openingPointCategoryId);
  const varietyId = normalizeOptionalText(input.varietyId);

  if (!code) {
    throw new Error("El codigo de la regla es obligatorio.");
  }
  if (!name) {
    throw new Error("El nombre de la regla es obligatorio.");
  }
  if (!validFrom) {
    throw new Error("La fecha de vigencia es obligatoria.");
  }
  if (!openingPointCategoryId) {
    throw new Error("La categoria de punto de apertura es obligatoria.");
  }

  parseDateStart(validFrom);

  return {
    code,
    name,
    validFrom,
    openingPointCategoryId,
    varietyId,
    notes,
    isActive: coerceBoolean(input.isActive, true),
    changeReason,
  };
}

async function ensureOpeningTargetRuleTables(client?: PoolClient) {
  const runQuery = (text: string, values: unknown[] = []) => client ? client.query(text, values) : queryGeneral(text, values);

  await runQuery(`
    create table if not exists ${RULE_REF_TABLE} (
      record_id text primary key,
      rule_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);

  await runQuery(`
    create table if not exists ${RULE_DIM_TABLE} (
      record_id text primary key,
      rule_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      rule_code text not null,
      rule_name text not null,
      opening_point_category_id text null,
      opening_point_category_code text null,
      opening_point_category_name text null,
      target_class_min integer not null,
      target_class_max integer not null,
      variety_id text null,
      farm_id text null,
      notes_text text null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);

  await runQuery(`
    alter table ${RULE_DIM_TABLE}
      add column if not exists opening_point_category_id text null
  `);

  await runQuery(`
    alter table ${RULE_DIM_TABLE}
      add column if not exists opening_point_category_code text null
  `);

  await runQuery(`
    alter table ${RULE_DIM_TABLE}
      add column if not exists opening_point_category_name text null
  `);

  await runQuery(`
    create unique index if not exists gnl_ref_opening_target_rule_current_idx
      on ${RULE_REF_TABLE} (rule_id)
      where is_current
  `);

  await runQuery(`
    create unique index if not exists gnl_dim_opening_target_rule_current_idx
      on ${RULE_DIM_TABLE} (rule_id)
      where is_current
  `);

  await runQuery(`
    create unique index if not exists gnl_dim_opening_target_rule_code_current_idx
      on ${RULE_DIM_TABLE} (lower(regexp_replace(trim(rule_code), '\\s+', ' ', 'g')))
      where is_current = true
        and is_valid = true
  `);

  await runQuery(`
    create index if not exists gnl_dim_opening_target_rule_scope_idx
      on ${RULE_DIM_TABLE} (
        coalesce(variety_id, '__all__'),
        is_current,
        is_active
      )
  `);
}

export async function initializeGeneralOpeningTargetRules() {
  global.__dashboardGeneralOpeningTargetRulesSetup = ensureOpeningTargetRuleTables();
  return global.__dashboardGeneralOpeningTargetRulesSetup;
}

async function getCurrentOpeningTargetRuleRows() {
  await initializeGeneralOpeningTargetRules();
  const result = await queryGeneral<OpeningTargetRuleRow>(
    `
      select
        rule_id,
        rule_code,
        rule_name,
        valid_from,
        valid_to,
        opening_point_category_id,
        opening_point_category_code,
        opening_point_category_name,
        target_class_min,
        target_class_max,
        variety_id,
        farm_id,
        notes_text,
        is_active,
        loaded_at,
        run_id,
        actor_id,
        change_reason
      from ${RULE_DIM_TABLE}
      where is_current = true
        and is_valid = true
      order by variety_id nulls first, valid_from desc, rule_code asc
    `,
  );

  return result.rows;
}

async function getCurrentOpeningTargetRuleById(ruleId: string) {
  const result = await queryGeneral<OpeningTargetRuleRow>(
    `
      select
        rule_id,
        rule_code,
        rule_name,
        valid_from,
        valid_to,
        opening_point_category_id,
        opening_point_category_code,
        opening_point_category_name,
        target_class_min,
        target_class_max,
        variety_id,
        farm_id,
        notes_text,
        is_active,
        loaded_at,
        run_id,
        actor_id,
        change_reason
      from ${RULE_DIM_TABLE}
      where rule_id = $1
        and is_current = true
        and is_valid = true
      limit 1
    `,
    [ruleId],
  );

  return result.rows[0] ?? null;
}

async function ensureUniqueCurrentRuleCode(code: string, excludeRuleId?: string) {
  const result = await queryGeneral<{ rule_id: string }>(
    `
      select rule_id
      from ${RULE_DIM_TABLE}
      where is_current = true
        and is_valid = true
        and lower(regexp_replace(trim(rule_code), '\\s+', ' ', 'g'))
          = lower(regexp_replace(trim($1), '\\s+', ' ', 'g'))
        and ($2::text is null or rule_id <> $2)
      limit 1
    `,
    [code, excludeRuleId ?? null],
  );

  if (result.rows.length > 0) {
    throw new Error(`Ya existe una regla vigente con el codigo "${code}".`);
  }
}

async function ensureUniqueCurrentScope(varietyId: string | null, excludeRuleId?: string) {
  const result = await queryGeneral<{ rule_id: string; rule_code: string }>(
    `
      select rule_id, rule_code
      from ${RULE_DIM_TABLE}
      where is_current = true
        and is_valid = true
        and coalesce(variety_id, '__all__') = coalesce($1::text, '__all__')
        and ($2::text is null or rule_id <> $2)
      limit 1
    `,
    [varietyId, excludeRuleId ?? null],
  );

  if (result.rows.length > 0) {
    throw new Error(
      `Ya existe una regla vigente para ese alcance. Edita la regla ${result.rows[0].rule_code} para programar un nuevo cambio.`,
    );
  }
}

function buildOptionMap(options: GeneralOpeningTargetRuleOption[]) {
  return new Map(options.map((option) => [option.value, option.label]));
}

function buildScopeLabel(rule: { varietyId: string | null; varietyName: string | null }) {
  if (rule.varietyId) {
    return `Variedad: ${rule.varietyName ?? rule.varietyId}`;
  }
  return "General";
}

function mapRuleRow(
  row: OpeningTargetRuleRow,
  openingPointMap: Map<string, { label: string; code: string | null }>,
  varietyMap: Map<string, string>,
): GeneralOpeningTargetRuleRecord {
  const varietyName = row.variety_id ? varietyMap.get(row.variety_id) ?? null : null;
  const inferredCategory = inferOpeningPointCategoryDefinitionByRange(Number(row.target_class_min), Number(row.target_class_max));
  const openingPointOption = row.opening_point_category_id
    ? openingPointMap.get(row.opening_point_category_id) ?? null
    : null;
  const openingPointCategoryCode = row.opening_point_category_code ?? openingPointOption?.code ?? inferredCategory?.code ?? null;
  const openingPointCategoryName = row.opening_point_category_name ?? openingPointOption?.label ?? inferredCategory?.name ?? null;

  return {
    ruleId: row.rule_id,
    code: row.rule_code,
    name: row.rule_name,
    validFrom: toDateOnly(row.valid_from) ?? "",
    validTo: toDateOnly(row.valid_to),
    openingPointCategoryId: row.opening_point_category_id,
    openingPointCategoryCode,
    openingPointCategoryName,
    targetClassMin: Number(row.target_class_min),
    targetClassMax: Number(row.target_class_max),
    varietyId: row.variety_id,
    varietyName,
    scopeLabel: buildScopeLabel({ varietyId: row.variety_id, varietyName }),
    notes: row.notes_text,
    isActive: coerceBoolean(row.is_active, true),
    loadedAt: formatTimestamp(row.loaded_at),
    runId: row.run_id,
    actorId: row.actor_id,
    changeReason: row.change_reason,
  };
}

export async function listCurrentGeneralOpeningTargetRules() {
  const [rows, openingPoints, varieties] = await Promise.all([
    getCurrentOpeningTargetRuleRows(),
    listCurrentGeneralSimpleMasterRecords("opening-points"),
    listCurrentGeneralSimpleMasterRecords("varieties"),
  ]);

  const openingPointMap = new Map(
    openingPoints.map((item) => [item.entityId, { label: item.name, code: item.code }]),
  );
  const varietyMap = buildOptionMap(varieties.map((item) => ({ value: item.entityId, label: item.name })));

  return rows.map((row) => mapRuleRow(row, openingPointMap, varietyMap));
}

export async function getGeneralOpeningTargetRuleModuleData(): Promise<GeneralOpeningTargetRuleModuleData> {
  const [rules, openingPoints, varieties] = await Promise.all([
    listCurrentGeneralOpeningTargetRules(),
    listCurrentGeneralSimpleMasterRecords("opening-points"),
    listCurrentGeneralSimpleMasterRecords("varieties"),
  ]);

  const openingPointOptions = openingPoints
    .map((item) => ({ value: item.entityId, label: item.name, meta: item.code, sortKey: item.externalRefCode ?? "9999" }))
    .sort((left, right) => left.sortKey.localeCompare(right.sortKey, "es", { numeric: true }))
    .map(({ value, label, meta }) => ({ value, label, meta }));
  const varietyOptions = varieties.map((item) => ({ value: item.entityId, label: item.name, meta: item.code }));

  return {
    rules,
    options: {
      openingPoints: openingPointOptions,
      varieties: varietyOptions,
    },
    summary: {
      totalRules: rules.length,
      activeRules: rules.filter((rule) => rule.isActive).length,
      generalRules: rules.filter((rule) => !rule.varietyId).length,
      scopedRules: rules.filter((rule) => rule.varietyId).length,
    },
    notes: [
      "Este modulo registra el criterio objetivo vigente para evaluar el punto de apertura.",
      "La categoria objetivo se alimenta del maestro General / Punto de apertura para mantener un solo lenguaje operativo.",
      "Cada edicion crea una nueva version SCD2 en db_general.public y cierra automaticamente la version anterior del mismo alcance.",
      "La primera fase controla alcance global o por variedad. Luego se puede extender a cliente o proceso si negocio lo define.",
    ],
  };
}

async function resolveOpeningPointSelection(openingPointCategoryId: string) {
  const openingPoints = await listCurrentGeneralSimpleMasterRecords("opening-points");
  const selectedOpeningPoint = openingPoints.find((item) => item.entityId === openingPointCategoryId);
  if (!selectedOpeningPoint) {
    throw new Error("La categoria de punto de apertura seleccionada no existe o no esta activa.");
  }

  const openingPointDefinition = getOpeningPointCategoryDefinitionByCode(selectedOpeningPoint.code);
  if (!openingPointDefinition) {
    throw new Error(`La categoria ${selectedOpeningPoint.code} no tiene rango operativo configurado.`);
  }

  return { selectedOpeningPoint, openingPointDefinition };
}

export async function createGeneralOpeningTargetRule(input: GeneralOpeningTargetRuleInput, actorId: string) {
  await initializeGeneralOpeningTargetRules();
  const sanitized = sanitizeInput(input);
  const { selectedOpeningPoint, openingPointDefinition } = await resolveOpeningPointSelection(sanitized.openingPointCategoryId);

  await ensureUniqueCurrentRuleCode(sanitized.code);
  await ensureUniqueCurrentScope(sanitized.varietyId);

  const validFromDate = parseDateStart(sanitized.validFrom);
  const loadedAt = new Date();
  const ruleId = makeRuleId();
  const runId = makeRunId("general_opening_target_rule_create");
  const changeReason = sanitized.changeReason ?? "CREATE_FROM_COREX_UI";

  await withGeneralTransaction(async (client) => {
    await ensureOpeningTargetRuleTables(client);

    await client.query(
      `
        insert into ${RULE_REF_TABLE} (
          record_id, rule_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $4, $5, $6, $7)
      `,
      [makeRecordId(), ruleId, validFromDate, loadedAt, runId, actorId, changeReason],
    );

    await client.query(
      `
        insert into ${RULE_DIM_TABLE} (
          record_id, rule_id, valid_from, valid_to, is_current, rule_code, rule_name, opening_point_category_id,
          opening_point_category_code, opening_point_category_name, target_class_min, target_class_max, variety_id, farm_id,
          notes_text, is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16, $17, $18)
      `,
      [
        makeRecordId(),
        ruleId,
        validFromDate,
        sanitized.code,
        sanitized.name,
        sanitized.openingPointCategoryId,
        selectedOpeningPoint.code,
        selectedOpeningPoint.name,
        openingPointDefinition.classMin,
        openingPointDefinition.classMax,
        sanitized.varietyId,
        null,
        sanitized.notes,
        sanitized.isActive,
        loadedAt,
        runId,
        actorId,
        changeReason,
      ],
    );
  });

  return (await listCurrentGeneralOpeningTargetRules()).find((rule) => rule.ruleId === ruleId) ?? null;
}

export async function updateGeneralOpeningTargetRule(ruleId: string, input: GeneralOpeningTargetRuleInput, actorId: string) {
  await initializeGeneralOpeningTargetRules();
  const current = await getCurrentOpeningTargetRuleById(ruleId);
  if (!current) {
    throw new Error("No se encontro la regla vigente que intentas editar.");
  }

  const sanitized = sanitizeInput(input);
  const { selectedOpeningPoint, openingPointDefinition } = await resolveOpeningPointSelection(sanitized.openingPointCategoryId);
  const currentValidFrom = toDateOnly(current.valid_from);
  if (currentValidFrom && sanitized.validFrom <= currentValidFrom) {
    throw new Error("La nueva vigencia debe ser posterior a la vigencia actual para conservar el historial.");
  }

  await ensureUniqueCurrentRuleCode(sanitized.code, ruleId);
  await ensureUniqueCurrentScope(sanitized.varietyId, ruleId);

  const validFromDate = parseDateStart(sanitized.validFrom);
  const previousValidTo = new Date(validFromDate.getTime() - 1000);
  const loadedAt = new Date();
  const runId = makeRunId("general_opening_target_rule_update");
  const changeReason = sanitized.changeReason ?? "UPDATE_FROM_COREX_UI";

  await withGeneralTransaction(async (client) => {
    await ensureOpeningTargetRuleTables(client);

    await client.query(
      `update ${RULE_REF_TABLE} set is_current = false, valid_to = $2 where rule_id = $1 and is_current = true`,
      [ruleId, previousValidTo],
    );
    await client.query(
      `update ${RULE_DIM_TABLE} set is_current = false, valid_to = $2 where rule_id = $1 and is_current = true`,
      [ruleId, previousValidTo],
    );

    await client.query(
      `
        insert into ${RULE_REF_TABLE} (
          record_id, rule_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $4, $5, $6, $7)
      `,
      [makeRecordId(), ruleId, validFromDate, loadedAt, runId, actorId, changeReason],
    );

    await client.query(
      `
        insert into ${RULE_DIM_TABLE} (
          record_id, rule_id, valid_from, valid_to, is_current, rule_code, rule_name, opening_point_category_id,
          opening_point_category_code, opening_point_category_name, target_class_min, target_class_max, variety_id, farm_id,
          notes_text, is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16, $17, $18)
      `,
      [
        makeRecordId(),
        ruleId,
        validFromDate,
        sanitized.code,
        sanitized.name,
        sanitized.openingPointCategoryId,
        selectedOpeningPoint.code,
        selectedOpeningPoint.name,
        openingPointDefinition.classMin,
        openingPointDefinition.classMax,
        sanitized.varietyId,
        null,
        sanitized.notes,
        sanitized.isActive,
        loadedAt,
        runId,
        actorId,
        changeReason,
      ],
    );
  });

  return (await listCurrentGeneralOpeningTargetRules()).find((rule) => rule.ruleId === ruleId) ?? null;
}
