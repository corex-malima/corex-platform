import "server-only";

import {
  defaultPuntoAperturaFilters,
  getPuntoAperturaDashboardData,
  normalizePuntoAperturaFilters,
  type PuntoAperturaDashboardData,
  type PuntoAperturaFilters,
  type PuntoAperturaRecord,
  type PuntoAperturaStatus,
} from "@/lib/calidad-punto-apertura";
import { queryAdmin } from "@/lib/admin-db";
import { initializeGeneralOpeningTargetRules } from "@/lib/general-opening-target-rules";
import { listCurrentGeneralSimpleMasterRecords } from "@/lib/general-masters";
import { queryGeneral } from "@/lib/general-db";

export type CampoPuntoAperturaGranularity = "day" | "week" | "month";
export type OpeningPointCategoryCode =
  | "PA_BOTON"
  | "PA_1_A_3"
  | "PA_4_A_9"
  | "PA_10_A_20"
  | "PA_MAS_DE_20";

export type CampoPuntoAperturaKpiFilters = PuntoAperturaFilters & {
  granularity: CampoPuntoAperturaGranularity;
};

export type CampoPuntoAperturaKpiPoint = {
  periodKey: string;
  periodLabel: string;
  sortDate: string;
  totalRecords: number;
  officialRecords: number;
  unofficialRecords: number;
  totalStems: number;
  officialStems: number;
  unofficialStems: number;
  weightedCompliancePct: number | null;
  directCompliancePct: number | null;
  goalPct: number | null;
  goalAttainmentPct: number | null;
  gapPct: number | null;
};

export type CampoPuntoAperturaDistributionRow = {
  categoryCode: string;
  categoryName: string;
  count: number;
  pct: number;
};

export type CampoPuntoAperturaNonConformityRuleKey =
  | "mas_de_20_supera_2_pct"
  | "diez_a_veinte_mas_mas_de_20_supera_25_pct"
  | "cuatro_a_nueve_supera_50_pct";

export type CampoPuntoAperturaNonConformityRuleResult = {
  key: CampoPuntoAperturaNonConformityRuleKey;
  label: string;
  thresholdPct: number;
  measuredPct: number;
};

export type CampoPuntoAperturaNonConformityRecord = {
  key: string;
  fecha: string;
  isoWeekId: string;
  month: string;
  year: string;
  area: string;
  block: string;
  totalStems: number;
  pctCuatroNueve: number;
  pctDiezVeinte: number;
  pctMasVeinte: number;
  pctDiezVeinteMasMasVeinte: number;
  isNonConformity: boolean;
  triggeredRules: CampoPuntoAperturaNonConformityRuleResult[];
};

export type CampoPuntoAperturaNonConformitySummary = {
  totalBlockDays: number;
  nonConformingBlockDays: number;
  conformingBlockDays: number;
  nonConformityRatePct: number | null;
  topRuleLabel: string | null;
};

export type CampoPuntoAperturaNonConformityPeriodPoint = {
  periodKey: string;
  periodLabel: string;
  sortDate: string;
  totalBlockDays: number;
  nonConformingBlockDays: number;
  nonConformityRatePct: number | null;
};

export type CampoPuntoAperturaNonConformityAreaRow = {
  area: string;
  totalBlockDays: number;
  nonConformingBlockDays: number;
  nonConformityRatePct: number | null;
};

export type CampoPuntoAperturaBlockBreakdown = {
  block: string;
  totalRecords: number;
  officialRecords: number;
  unofficialRecords: number;
  totalStems: number;
  totalBlockDays: number;
  nonConformingBlockDays: number;
  hasNonConformity: boolean;
  triggeredRuleLabels: string[];
  weightedCompliancePct: number | null;
  directCompliancePct: number | null;
  goalPct: number | null;
  goalAttainmentPct: number | null;
  gapPct: number | null;
  dominantCategoryName: string | null;
  nonConformityDetails: CampoPuntoAperturaNonConformityRecord[];
};

export type CampoPuntoAperturaAreaBreakdown = {
  area: string;
  totalRecords: number;
  officialRecords: number;
  unofficialRecords: number;
  totalStems: number;
  totalBlockDays: number;
  nonConformingBlockDays: number;
  weightedCompliancePct: number | null;
  directCompliancePct: number | null;
  goalPct: number | null;
  goalAttainmentPct: number | null;
  gapPct: number | null;
  dominantCategoryName: string | null;
  blocks: CampoPuntoAperturaBlockBreakdown[];
};

export type CampoPuntoAperturaHomogeneityTimePoint = {
  periodKey: string;
  periodLabel: string;
  sortDate: string;
  totalRecords: number;
  officialRecords: number;
  unofficialRecords: number;
  homogeneousRecords: number;
  nonHomogeneousRecords: number;
  homogeneousPct: number | null;
  goalPct: number | null;
  goalAttainmentPct: number | null;
};

export type CampoPuntoAperturaHomogeneityNonConformityDetail = {
  key: string;
  fecha: string;
  totalRecords: number;
  homogeneousRecords: number;
  nonHomogeneousRecords: number;
  homogeneousPct: number | null;
};

export type CampoPuntoAperturaHomogeneityBlockBreakdown = {
  block: string;
  totalRecords: number;
  officialRecords: number;
  unofficialRecords: number;
  homogeneousRecords: number;
  nonHomogeneousRecords: number;
  homogeneousPct: number | null;
  goalPct: number | null;
  goalAttainmentPct: number | null;
  nonConformingBlockDays: number;
  totalBlockDays: number;
  nonConformityDetails: CampoPuntoAperturaHomogeneityNonConformityDetail[];
};

export type CampoPuntoAperturaHomogeneityAreaBreakdown = {
  area: string;
  totalRecords: number;
  officialRecords: number;
  unofficialRecords: number;
  homogeneousRecords: number;
  nonHomogeneousRecords: number;
  homogeneousPct: number | null;
  goalPct: number | null;
  goalAttainmentPct: number | null;
  nonConformingBlockDays: number;
  totalBlockDays: number;
  blocks: CampoPuntoAperturaHomogeneityBlockBreakdown[];
};

export type CampoPuntoAperturaKpiData = {
  generatedAt: string;
  filters: CampoPuntoAperturaKpiFilters;
  options: PuntoAperturaDashboardData["options"];
  sourceSummary: PuntoAperturaDashboardData["summary"];
  goal: {
    targetCode: string | null;
    targetName: string | null;
    operatorCode: string | null;
    directGoalPct: number | null;
    goalPct: number | null;
    weightedSchemeCode: string | null;
    validFrom: string | null;
    validTo: string | null;
  };
  summary: {
    totalRecords: number;
    officialRecords: number;
    unofficialRecords: number;
    totalStems: number;
    officialStems: number;
    unofficialStems: number;
    weightedCompliancePct: number | null;
    directCompliancePct: number | null;
    goalPct: number | null;
    goalAttainmentPct: number | null;
    gapPct: number | null;
    targetCategoryLabel: string | null;
    officialCoveragePct: number;
  };
  timeSeries: CampoPuntoAperturaKpiPoint[];
  distribution: CampoPuntoAperturaDistributionRow[];
  areas: CampoPuntoAperturaAreaBreakdown[];
  nonConformities: {
    summary: CampoPuntoAperturaNonConformitySummary;
    timeSeries: CampoPuntoAperturaNonConformityPeriodPoint[];
    areas: CampoPuntoAperturaNonConformityAreaRow[];
    records: CampoPuntoAperturaNonConformityRecord[];
    rulesContextStatus: "pending-goals-catalog";
  };
  homogeneity: {
    goal: {
      targetCode: string | null;
      targetName: string | null;
      operatorCode: string | null;
      goalPct: number | null;
      validFrom: string | null;
      validTo: string | null;
    };
    summary: {
      totalRecords: number;
      officialRecords: number;
      unofficialRecords: number;
      homogeneousRecords: number;
      nonHomogeneousRecords: number;
      homogeneousPct: number | null;
      goalPct: number | null;
      goalAttainmentPct: number | null;
    };
    timeSeries: CampoPuntoAperturaHomogeneityTimePoint[];
    distribution: Array<{ status: PuntoAperturaStatus; count: number; pct: number }>;
    areas: CampoPuntoAperturaHomogeneityAreaBreakdown[];
  };
  notes: string[];
};

type GoalRow = {
  target_code: string | null;
  target_name: string | null;
  metric_code: string | null;
  operator_code: string | null;
  value_min: string | number | null;
  value_max: string | number | null;
  target_scope_jsonb: Record<string, unknown> | null;
  valid_from: string | Date | null;
  valid_to: string | Date | null;
};

type RuleHistoryRow = {
  rule_id: string;
  rule_code: string;
  rule_name: string;
  valid_from: string | Date;
  valid_to: string | Date | null;
  opening_point_category_code: string | null;
  opening_point_category_name: string | null;
  target_class_min: number | string;
  target_class_max: number | string;
  variety_id: string | null;
  is_active: boolean | null;
  is_valid: boolean | null;
};

type VarietyRecord = {
  entityId: string;
  code: string;
  name: string;
};

type OpeningRule = {
  ruleId: string;
  categoryCode: OpeningPointCategoryCode;
  categoryName: string;
  targetClassMin: number;
  targetClassMax: number;
  varietyId: string | null;
  varietyName: string | null;
  varietyCode: string | null;
  varietyMatchKeys: string[];
  validFrom: string;
  validTo: string | null;
};

type EvaluatedRecord = PuntoAperturaRecord & {
  goalPct: number | null;
  targetCategoryCode: string | null;
  targetCategoryName: string | null;
  hasOfficialGoal: boolean;
  directCompliancePct: number | null;
  weightedCompliancePct: number | null;
  dominantCategoryCode: OpeningPointCategoryCode;
  countsByCategory: Record<OpeningPointCategoryCode, number>;
};

const GOAL_TARGET_CODE = "punto_apertura_participacion_dominante_global_60";
const HOMOGENEITY_GOAL_TARGET_CODE = "punto_apertura_homogeneidad_global_90";
const WEIGHT_SCHEME_CODE = "opening_point_weight_v1";
const DEFAULT_WEIGHTED_GOAL_PCT = 76;
const CATEGORY_ORDER: ReadonlyArray<{
  code: OpeningPointCategoryCode;
  label: string;
  accessor: (record: PuntoAperturaRecord) => number;
}> = [
  { code: "PA_BOTON", label: "Boton", accessor: (record: PuntoAperturaRecord) => record.apertura.boton },
  { code: "PA_1_A_3", label: "1 a 3", accessor: (record: PuntoAperturaRecord) => record.apertura.unoTres },
  { code: "PA_4_A_9", label: "4 a 9", accessor: (record: PuntoAperturaRecord) => record.apertura.cuatroNueve },
  { code: "PA_10_A_20", label: "10 a 20", accessor: (record: PuntoAperturaRecord) => record.apertura.diezVeinte },
  { code: "PA_MAS_DE_20", label: "Mas de 20", accessor: (record: PuntoAperturaRecord) => record.apertura.masVeinte },
] as const;
const CATEGORY_INDEX = new Map<OpeningPointCategoryCode, number>(CATEGORY_ORDER.map((item, index) => [item.code, index]));
const CATEGORY_LABEL = new Map<OpeningPointCategoryCode, string>(CATEGORY_ORDER.map((item) => [item.code, item.label]));
const DISTANCE_WEIGHT = new Map<number, number>([
  [0, 1],
  [1, 0.5],
  [2, 0.25],
  [3, 0.125],
]);
const NON_CONFORMITY_VARIETY_KEYS = new Set(["xle", "xlence"]);
const NON_CONFORMITY_RULE_LABEL = new Map<CampoPuntoAperturaNonConformityRuleKey, string>([
  ["mas_de_20_supera_2_pct", "Más de 20 > 2%"],
  ["diez_a_veinte_mas_mas_de_20_supera_25_pct", "10 a 20 + Más de 20 >= 25%"],
  ["cuatro_a_nueve_supera_50_pct", "4 a 9 >= 50%"],
]);

export const defaultCampoPuntoAperturaKpiFilters: CampoPuntoAperturaKpiFilters = {
  ...defaultPuntoAperturaFilters,
  granularity: "week",
};

export function normalizeCampoPuntoAperturaKpiFilters(
  input: Partial<CampoPuntoAperturaKpiFilters> = {},
): CampoPuntoAperturaKpiFilters {
  const normalizedBase = normalizePuntoAperturaFilters(input);
  const granularity = input.granularity === "day" || input.granularity === "month" ? input.granularity : "week";
  return {
    ...normalizedBase,
    granularity,
  };
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoDate(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeKey(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function distanceWeight(distance: number) {
  return DISTANCE_WEIGHT.get(distance) ?? 0;
}

function weightedAverage(items: Array<{ value: number | null; weight: number }>) {
  let numerator = 0;
  let denominator = 0;
  for (const item of items) {
    if (item.value === null || item.weight <= 0) continue;
    numerator += item.value * item.weight;
    denominator += item.weight;
  }
  return denominator > 0 ? numerator / denominator : null;
}

function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

function buildCountsByCategory(record: PuntoAperturaRecord): Record<OpeningPointCategoryCode, number> {
  return {
    PA_BOTON: record.apertura.boton,
    PA_1_A_3: record.apertura.unoTres,
    PA_4_A_9: record.apertura.cuatroNueve,
    PA_10_A_20: record.apertura.diezVeinte,
    PA_MAS_DE_20: record.apertura.masVeinte,
  };
}

function dominantCategoryCode(record: PuntoAperturaRecord): OpeningPointCategoryCode {
  if (record.dominanteClase === "Boton") return "PA_BOTON";
  if (record.dominanteClase === "1 a 3") return "PA_1_A_3";
  if (record.dominanteClase === "4 a 9") return "PA_4_A_9";
  if (record.dominanteClase === "10 a 20") return "PA_10_A_20";
  return "PA_MAS_DE_20";
}

async function loadOpeningGoal() {
  try {
    const result = await queryAdmin<GoalRow>(
      `
        select
          target_code,
          target_name,
          metric_code,
          operator_code,
          value_min,
          value_max,
          target_scope_jsonb,
          valid_from,
          valid_to
        from public.vw_adm_goal_target_active
        where target_code = $1
        limit 1
      `,
      [GOAL_TARGET_CODE],
    );

    const row = result.rows[0];
    if (!row) {
      return {
        targetCode: null,
        targetName: null,
        operatorCode: null,
        directGoalPct: null,
        goalPct: null,
        weightedSchemeCode: null,
        validFrom: null,
        validTo: null,
      };
    }

    const scope = row.target_scope_jsonb ?? {};
    const directGoalPct = toNumber(row.value_min);
    const weightedGoalPct = typeof scope?.weighted_goal_pct === "number"
      ? scope.weighted_goal_pct
      : typeof scope?.weighted_goal_pct === "string"
        ? toNumber(scope.weighted_goal_pct)
        : row.target_code === GOAL_TARGET_CODE && directGoalPct === 60
          ? DEFAULT_WEIGHTED_GOAL_PCT
          : directGoalPct;
    const weightedSchemeCode = typeof scope?.weight_scheme_code === "string"
      ? scope.weight_scheme_code
      : WEIGHT_SCHEME_CODE;

    return {
      targetCode: row.target_code,
      targetName: row.target_name,
      operatorCode: row.operator_code,
      directGoalPct,
      goalPct: weightedGoalPct,
      weightedSchemeCode,
      validFrom: toIsoDate(row.valid_from),
      validTo: toIsoDate(row.valid_to),
    };
  } catch {
      return {
        targetCode: null,
        targetName: null,
        operatorCode: null,
        directGoalPct: null,
        goalPct: null,
        weightedSchemeCode: null,
        validFrom: null,
      validTo: null,
    };
  }
}

async function loadHomogeneityGoal() {
  try {
    const result = await queryAdmin<GoalRow>(
      `
        select
          target_code,
          target_name,
          metric_code,
          operator_code,
          value_min,
          value_max,
          target_scope_jsonb,
          valid_from,
          valid_to
        from public.vw_adm_goal_target_active
        where target_code = $1
        limit 1
      `,
      [HOMOGENEITY_GOAL_TARGET_CODE],
    );

    const row = result.rows[0];
    if (!row) {
      return {
        targetCode: null,
        targetName: null,
        operatorCode: null,
        goalPct: null,
        validFrom: null,
        validTo: null,
      };
    }

    return {
      targetCode: row.target_code,
      targetName: row.target_name,
      operatorCode: row.operator_code,
      goalPct: toNumber(row.value_min),
      validFrom: toIsoDate(row.valid_from),
      validTo: toIsoDate(row.valid_to),
    };
  } catch {
    return {
      targetCode: null,
      targetName: null,
      operatorCode: null,
      goalPct: null,
      validFrom: null,
      validTo: null,
    };
  }
}

async function loadOpeningRules(): Promise<OpeningRule[]> {
  await initializeGeneralOpeningTargetRules();

  const [rows, varieties] = await Promise.all([
    queryGeneral<RuleHistoryRow>(
      `
        select
          rule_id,
          rule_code,
          rule_name,
          valid_from,
          valid_to,
          opening_point_category_code,
          opening_point_category_name,
          target_class_min,
          target_class_max,
          variety_id,
          is_active,
          is_valid
        from public.gnl_dim_opening_target_rule_profile_scd2
        where is_valid = true
          and is_active = true
          and opening_point_category_code is not null
        order by coalesce(variety_id, '__all__'), valid_from desc
      `,
    ),
    listCurrentGeneralSimpleMasterRecords("varieties"),
  ]);

  const varietyMap = new Map<string, VarietyRecord>(
    varieties.map((item) => [
      item.entityId,
      { entityId: item.entityId, code: item.code, name: item.name },
    ]),
  );

  return rows.rows
    .map((row): OpeningRule | null => {
      const rawCategoryCode = row.opening_point_category_code?.trim().toUpperCase() ?? null;
      if (!rawCategoryCode || !CATEGORY_INDEX.has(rawCategoryCode as OpeningPointCategoryCode)) return null;
      const categoryCode = rawCategoryCode as OpeningPointCategoryCode;
      const variety = row.variety_id ? varietyMap.get(row.variety_id) ?? null : null;
      const varietyMatchKeys = variety
        ? [normalizeKey(variety.name), normalizeKey(variety.code)].filter(Boolean)
        : [];

      return {
        ruleId: row.rule_id,
        categoryCode,
        categoryName: row.opening_point_category_name ?? CATEGORY_LABEL.get(categoryCode) ?? categoryCode,
        targetClassMin: toNumber(row.target_class_min) ?? 0,
        targetClassMax: toNumber(row.target_class_max) ?? 0,
        varietyId: row.variety_id,
        varietyName: variety?.name ?? null,
        varietyCode: variety?.code ?? null,
        varietyMatchKeys,
        validFrom: toIsoDate(row.valid_from) ?? "1900-01-01",
        validTo: toIsoDate(row.valid_to),
      };
    })
    .filter((row): row is OpeningRule => Boolean(row));
}

function ruleAppliesToDate(rule: OpeningRule, date: string) {
  if (date < rule.validFrom) return false;
  if (rule.validTo && date > rule.validTo) return false;
  return true;
}

function recordAppliesToNonConformityRules(record: PuntoAperturaRecord) {
  return NON_CONFORMITY_VARIETY_KEYS.has(normalizeKey(record.variety));
}

function resolveApplicableRule(record: PuntoAperturaRecord, rules: OpeningRule[]) {
  const recordDate = record.fecha;
  const varietyKey = normalizeKey(record.variety);

  const scoped = rules.filter((rule) =>
    rule.varietyId &&
    rule.varietyMatchKeys.includes(varietyKey) &&
    ruleAppliesToDate(rule, recordDate),
  );
  if (scoped.length > 0) {
    return scoped.sort((left, right) => right.validFrom.localeCompare(left.validFrom))[0] ?? null;
  }

  const general = rules.filter((rule) => !rule.varietyId && ruleAppliesToDate(rule, recordDate));
  return general.sort((left, right) => right.validFrom.localeCompare(left.validFrom))[0] ?? null;
}

function evaluateRecord(record: PuntoAperturaRecord, rule: OpeningRule | null, goal: Awaited<ReturnType<typeof loadOpeningGoal>>): EvaluatedRecord {
  const countsByCategory = buildCountsByCategory(record);
  const targetCategoryCode = rule?.categoryCode ?? null;
  const goalDateValid = goal.goalPct !== null && goal.validFrom !== null && record.fecha >= goal.validFrom && (!goal.validTo || record.fecha <= goal.validTo);
  const hasOfficialGoal = Boolean(rule && targetCategoryCode && goalDateValid);

  let directCompliancePct: number | null = null;
  let weightedCompliancePct: number | null = null;

  if (hasOfficialGoal && targetCategoryCode) {
    const total = record.totalApertura;
    const targetCount = countsByCategory[targetCategoryCode as OpeningPointCategoryCode] ?? 0;
    directCompliancePct = total > 0 ? (targetCount / total) * 100 : null;

    const targetIndex = CATEGORY_INDEX.get(targetCategoryCode as OpeningPointCategoryCode);
    if (targetIndex !== undefined && total > 0) {
      weightedCompliancePct = CATEGORY_ORDER.reduce((acc, category) => {
        const categoryIndex = CATEGORY_INDEX.get(category.code) ?? 0;
        const distance = Math.abs(categoryIndex - targetIndex);
        const credit = distanceWeight(distance);
        const count = countsByCategory[category.code] ?? 0;
        return acc + ((count / total) * 100 * credit);
      }, 0);
    }
  }

  return {
    ...record,
    goalPct: hasOfficialGoal ? goal.goalPct : null,
    targetCategoryCode,
    targetCategoryName: rule?.categoryName ?? null,
    hasOfficialGoal,
    directCompliancePct,
    weightedCompliancePct,
    dominantCategoryCode: dominantCategoryCode(record),
    countsByCategory,
  };
}

function periodInfo(record: PuntoAperturaRecord, granularity: CampoPuntoAperturaGranularity) {
  if (granularity === "day") {
    return { key: record.fecha, label: record.fecha, sortDate: record.fecha };
  }
  if (granularity === "month") {
    const month = record.month.padStart(2, "0");
    const key = `${record.year}-${month}`;
    return { key, label: key, sortDate: `${key}-01` };
  }
  const key = record.isoWeekId;
  return { key, label: key, sortDate: record.fecha };
}

function summarizeEvaluatedRecords(records: EvaluatedRecord[]) {
  const totalRecords = records.length;
  const officialRecords = records.filter((record) => record.hasOfficialGoal);
  const unofficialRecords = totalRecords - officialRecords.length;
  const totalStems = sum(records.map((record) => record.totalApertura));
  const officialStems = sum(officialRecords.map((record) => record.totalApertura));
  const unofficialStems = totalStems - officialStems;
  const weightedCompliancePct = weightedAverage(
    officialRecords.map((record) => ({
      value: record.weightedCompliancePct,
      weight: record.totalApertura,
    })),
  );
  const directCompliancePct = weightedAverage(
    officialRecords.map((record) => ({
      value: record.directCompliancePct,
      weight: record.totalApertura,
    })),
  );
  const goalPct = weightedAverage(
    officialRecords.map((record) => ({
      value: record.goalPct,
      weight: record.totalApertura,
    })),
  );
  const goalAttainmentPct =
    weightedCompliancePct !== null && goalPct !== null && goalPct > 0
      ? (weightedCompliancePct / goalPct) * 100
      : null;
  const gapPct = weightedCompliancePct !== null && goalPct !== null ? weightedCompliancePct - goalPct : null;
  const targetCategorySet = new Set(
    officialRecords
      .map((record) => record.targetCategoryName)
      .filter((value): value is string => Boolean(value)),
  );
  const targetCategoryLabel = targetCategorySet.size === 1
    ? Array.from(targetCategorySet)[0] ?? null
    : targetCategorySet.size > 1
      ? "Mixto por variedad"
      : null;

  return {
    totalRecords,
    officialRecords: officialRecords.length,
    unofficialRecords,
    totalStems,
    officialStems,
    unofficialStems,
    weightedCompliancePct,
    directCompliancePct,
    goalPct,
    goalAttainmentPct,
    gapPct,
    targetCategoryLabel,
    officialCoveragePct: totalRecords > 0 ? (officialRecords.length / totalRecords) * 100 : 0,
  };
}

function buildTimeSeries(records: EvaluatedRecord[], granularity: CampoPuntoAperturaGranularity) {
  const groups = new Map<string, EvaluatedRecord[]>();
  const meta = new Map<string, { label: string; sortDate: string }>();

  for (const record of records) {
    const info = periodInfo(record, granularity);
    const list = groups.get(info.key) ?? [];
    list.push(record);
    groups.set(info.key, list);

    const currentMeta = meta.get(info.key);
    if (!currentMeta || info.sortDate < currentMeta.sortDate) {
      meta.set(info.key, { label: info.label, sortDate: info.sortDate });
    }
  }

  return Array.from(groups.entries())
    .map(([periodKey, rows]) => {
      const summary = summarizeEvaluatedRecords(rows);
      const periodMeta = meta.get(periodKey) ?? { label: periodKey, sortDate: periodKey };
      return {
        periodKey,
        periodLabel: periodMeta.label,
        sortDate: periodMeta.sortDate,
        totalRecords: summary.totalRecords,
        officialRecords: summary.officialRecords,
        unofficialRecords: summary.unofficialRecords,
        totalStems: summary.totalStems,
        officialStems: summary.officialStems,
        unofficialStems: summary.unofficialStems,
        weightedCompliancePct: summary.weightedCompliancePct,
        directCompliancePct: summary.directCompliancePct,
        goalPct: summary.goalPct,
        goalAttainmentPct: summary.goalAttainmentPct,
        gapPct: summary.gapPct,
      } satisfies CampoPuntoAperturaKpiPoint;
    })
    .sort((left, right) => left.sortDate.localeCompare(right.sortDate));
}

function buildDistribution(records: EvaluatedRecord[]): CampoPuntoAperturaDistributionRow[] {
  const total = sum(records.map((record) => record.totalApertura));
  return CATEGORY_ORDER.map((category) => {
    const count = sum(records.map((record) => record.countsByCategory[category.code] ?? 0));
    return {
      categoryCode: category.code,
      categoryName: category.label,
      count,
      pct: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

function buildNonConformityRecords(records: EvaluatedRecord[]): CampoPuntoAperturaNonConformityRecord[] {
  const groups = new Map<string, EvaluatedRecord[]>();

  for (const record of records) {
    if (!recordAppliesToNonConformityRules(record)) continue;
    const key = `${record.fecha}__${record.area || "Sin area"}__${record.bloque || "Sin bloque"}`;
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  }

  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const sample = rows[0];
      const totalStems = sum(rows.map((row) => row.totalApertura));
      const cuatroNueve = sum(rows.map((row) => row.countsByCategory.PA_4_A_9 ?? 0));
      const diezVeinte = sum(rows.map((row) => row.countsByCategory.PA_10_A_20 ?? 0));
      const masVeinte = sum(rows.map((row) => row.countsByCategory.PA_MAS_DE_20 ?? 0));

      const pctCuatroNueve = totalStems > 0 ? (cuatroNueve / totalStems) * 100 : 0;
      const pctDiezVeinte = totalStems > 0 ? (diezVeinte / totalStems) * 100 : 0;
      const pctMasVeinte = totalStems > 0 ? (masVeinte / totalStems) * 100 : 0;
      const pctDiezVeinteMasMasVeinte = pctDiezVeinte + pctMasVeinte;

      const triggeredRules: CampoPuntoAperturaNonConformityRuleResult[] = [];
      if (pctMasVeinte > 2) {
        triggeredRules.push({
          key: "mas_de_20_supera_2_pct",
          label: NON_CONFORMITY_RULE_LABEL.get("mas_de_20_supera_2_pct") ?? "Más de 20 > 2%",
          thresholdPct: 2,
          measuredPct: pctMasVeinte,
        });
      }
      if (pctDiezVeinteMasMasVeinte >= 25) {
        triggeredRules.push({
          key: "diez_a_veinte_mas_mas_de_20_supera_25_pct",
          label: NON_CONFORMITY_RULE_LABEL.get("diez_a_veinte_mas_mas_de_20_supera_25_pct") ?? "10 a 20 + Más de 20 >= 25%",
          thresholdPct: 25,
          measuredPct: pctDiezVeinteMasMasVeinte,
        });
      }
      if (pctCuatroNueve >= 50) {
        triggeredRules.push({
          key: "cuatro_a_nueve_supera_50_pct",
          label: NON_CONFORMITY_RULE_LABEL.get("cuatro_a_nueve_supera_50_pct") ?? "4 a 9 >= 50%",
          thresholdPct: 50,
          measuredPct: pctCuatroNueve,
        });
      }

      return {
        key,
        fecha: sample?.fecha ?? "",
        isoWeekId: sample?.isoWeekId ?? "",
        month: sample?.month ?? "",
        year: sample?.year ?? "",
        area: sample?.area || "Sin area",
        block: sample?.bloque || "Sin bloque",
        totalStems,
        pctCuatroNueve,
        pctDiezVeinte,
        pctMasVeinte,
        pctDiezVeinteMasMasVeinte,
        isNonConformity: triggeredRules.length > 0,
        triggeredRules,
      };
    })
    .sort((left, right) => {
      if (left.fecha !== right.fecha) return right.fecha.localeCompare(left.fecha);
      if (left.area !== right.area) return left.area.localeCompare(right.area);
      return left.block.localeCompare(right.block);
    });
}

function summarizeNonConformities(records: CampoPuntoAperturaNonConformityRecord[]): CampoPuntoAperturaNonConformitySummary {
  const totalBlockDays = records.length;
  const nonConformingBlockDays = records.filter((record) => record.isNonConformity).length;
  const conformingBlockDays = totalBlockDays - nonConformingBlockDays;
  const nonConformityRatePct = totalBlockDays > 0 ? (nonConformingBlockDays / totalBlockDays) * 100 : null;
  const ruleCounts = new Map<string, number>();

  for (const record of records) {
    for (const rule of record.triggeredRules) {
      ruleCounts.set(rule.label, (ruleCounts.get(rule.label) ?? 0) + 1);
    }
  }

  const topRuleLabel =
    Array.from(ruleCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;

  return {
    totalBlockDays,
    nonConformingBlockDays,
    conformingBlockDays,
    nonConformityRatePct,
    topRuleLabel,
  };
}

function buildNonConformityTimeSeries(
  records: CampoPuntoAperturaNonConformityRecord[],
  granularity: CampoPuntoAperturaGranularity,
): CampoPuntoAperturaNonConformityPeriodPoint[] {
  const groups = new Map<string, CampoPuntoAperturaNonConformityRecord[]>();
  const meta = new Map<string, { label: string; sortDate: string }>();

  for (const record of records) {
    const info =
      granularity === "day"
        ? { key: record.fecha, label: record.fecha, sortDate: record.fecha }
        : granularity === "month"
          ? {
              key: `${record.year}-${record.month.padStart(2, "0")}`,
              label: `${record.year}-${record.month.padStart(2, "0")}`,
              sortDate: `${record.year}-${record.month.padStart(2, "0")}-01`,
            }
          : { key: record.isoWeekId, label: record.isoWeekId, sortDate: record.fecha };

    const rows = groups.get(info.key) ?? [];
    rows.push(record);
    groups.set(info.key, rows);

    const currentMeta = meta.get(info.key);
    if (!currentMeta || info.sortDate < currentMeta.sortDate) {
      meta.set(info.key, { label: info.label, sortDate: info.sortDate });
    }
  }

  return Array.from(groups.entries())
    .map(([periodKey, rows]) => {
      const summary = summarizeNonConformities(rows);
      const periodMeta = meta.get(periodKey) ?? { label: periodKey, sortDate: periodKey };
      return {
        periodKey,
        periodLabel: periodMeta.label,
        sortDate: periodMeta.sortDate,
        totalBlockDays: summary.totalBlockDays,
        nonConformingBlockDays: summary.nonConformingBlockDays,
        nonConformityRatePct: summary.nonConformityRatePct,
      };
    })
    .sort((left, right) => left.sortDate.localeCompare(right.sortDate));
}

function buildNonConformityAreas(records: CampoPuntoAperturaNonConformityRecord[]): CampoPuntoAperturaNonConformityAreaRow[] {
  const groups = new Map<string, CampoPuntoAperturaNonConformityRecord[]>();
  for (const record of records) {
    const rows = groups.get(record.area) ?? [];
    rows.push(record);
    groups.set(record.area, rows);
  }

  return Array.from(groups.entries())
    .map(([area, rows]) => {
      const summary = summarizeNonConformities(rows);
      return {
        area,
        totalBlockDays: summary.totalBlockDays,
        nonConformingBlockDays: summary.nonConformingBlockDays,
        nonConformityRatePct: summary.nonConformityRatePct,
      };
    })
    .sort((left, right) => (right.nonConformityRatePct ?? 0) - (left.nonConformityRatePct ?? 0));
}

function buildBlockBreakdown(records: EvaluatedRecord[]): CampoPuntoAperturaBlockBreakdown[] {
  const groups = new Map<string, EvaluatedRecord[]>();
  for (const record of records) {
    const key = record.bloque || "Sin bloque";
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  }

  return Array.from(groups.entries())
    .map(([block, rows]) => {
      const summary = summarizeEvaluatedRecords(rows);
      const dominant = buildDistribution(rows).sort((left, right) => right.count - left.count)[0] ?? null;
      const nonConformityRecords = buildNonConformityRecords(rows);
      const nonConformitySummary = summarizeNonConformities(nonConformityRecords);
      const triggeredRuleLabels = Array.from(
        new Set(nonConformityRecords.flatMap((record) => record.triggeredRules.map((rule) => rule.label))),
      );
      return {
        block,
        totalRecords: summary.totalRecords,
        officialRecords: summary.officialRecords,
        unofficialRecords: summary.unofficialRecords,
        totalStems: summary.totalStems,
        totalBlockDays: nonConformitySummary.totalBlockDays,
        nonConformingBlockDays: nonConformitySummary.nonConformingBlockDays,
        hasNonConformity: nonConformitySummary.nonConformingBlockDays > 0,
        triggeredRuleLabels,
        weightedCompliancePct: summary.weightedCompliancePct,
        directCompliancePct: summary.directCompliancePct,
        goalPct: summary.goalPct,
        goalAttainmentPct: summary.goalAttainmentPct,
        gapPct: summary.gapPct,
        dominantCategoryName: dominant?.categoryName ?? null,
        nonConformityDetails: nonConformityRecords.filter((record) => record.isNonConformity),
      };
    })
    .sort((left, right) => {
      if (left.weightedCompliancePct === null && right.weightedCompliancePct === null) {
        return right.totalStems - left.totalStems;
      }
      if (left.weightedCompliancePct === null) return 1;
      if (right.weightedCompliancePct === null) return -1;
      return right.weightedCompliancePct - left.weightedCompliancePct;
    });
}

function buildAreaBreakdown(records: EvaluatedRecord[]): CampoPuntoAperturaAreaBreakdown[] {
  const groups = new Map<string, EvaluatedRecord[]>();
  for (const record of records) {
    const key = record.area || "Sin area";
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  }

  return Array.from(groups.entries())
    .map(([area, rows]) => {
      const summary = summarizeEvaluatedRecords(rows);
      const dominant = buildDistribution(rows).sort((left, right) => right.count - left.count)[0] ?? null;
      const nonConformityRecords = buildNonConformityRecords(rows);
      const nonConformitySummary = summarizeNonConformities(nonConformityRecords);
      return {
        area,
        totalRecords: summary.totalRecords,
        officialRecords: summary.officialRecords,
        unofficialRecords: summary.unofficialRecords,
        totalStems: summary.totalStems,
        totalBlockDays: nonConformitySummary.totalBlockDays,
        nonConformingBlockDays: nonConformitySummary.nonConformingBlockDays,
        weightedCompliancePct: summary.weightedCompliancePct,
        directCompliancePct: summary.directCompliancePct,
        goalPct: summary.goalPct,
        goalAttainmentPct: summary.goalAttainmentPct,
        gapPct: summary.gapPct,
        dominantCategoryName: dominant?.categoryName ?? null,
        blocks: buildBlockBreakdown(rows),
      };
    })
    .sort((left, right) => {
      if (left.weightedCompliancePct === null && right.weightedCompliancePct === null) {
        return right.totalStems - left.totalStems;
      }
      if (left.weightedCompliancePct === null) return 1;
      if (right.weightedCompliancePct === null) return -1;
      return right.weightedCompliancePct - left.weightedCompliancePct;
    });
}

function homogeneityGoalApplies(record: PuntoAperturaRecord, goal: Awaited<ReturnType<typeof loadHomogeneityGoal>>) {
  return Boolean(
    goal.goalPct !== null &&
      goal.validFrom !== null &&
      record.fecha >= goal.validFrom &&
      (!goal.validTo || record.fecha <= goal.validTo),
  );
}

function summarizeHomogeneityRecords(
  records: PuntoAperturaRecord[],
  goal: Awaited<ReturnType<typeof loadHomogeneityGoal>>,
) {
  const totalRecords = records.length;
  const officialRecords = records.filter((record) => homogeneityGoalApplies(record, goal));
  const unofficialRecords = totalRecords - officialRecords.length;
  const homogeneousRecords = officialRecords.filter((record) => record.estado === "Homogeneo").length;
  const nonHomogeneousRecords = officialRecords.length - homogeneousRecords;
  const homogeneousPct = officialRecords.length > 0 ? (homogeneousRecords / officialRecords.length) * 100 : null;
  const goalPct = officialRecords.length > 0 ? goal.goalPct : null;
  const goalAttainmentPct =
    homogeneousPct !== null && goalPct !== null && goalPct > 0 ? (homogeneousPct / goalPct) * 100 : null;

  return {
    totalRecords,
    officialRecords: officialRecords.length,
    unofficialRecords,
    homogeneousRecords,
    nonHomogeneousRecords,
    homogeneousPct,
    goalPct,
    goalAttainmentPct,
  };
}

function buildHomogeneityTimeSeries(
  records: PuntoAperturaRecord[],
  granularity: CampoPuntoAperturaGranularity,
  goal: Awaited<ReturnType<typeof loadHomogeneityGoal>>,
): CampoPuntoAperturaHomogeneityTimePoint[] {
  const groups = new Map<string, PuntoAperturaRecord[]>();
  const meta = new Map<string, { label: string; sortDate: string }>();

  for (const record of records) {
    const info = periodInfo(record, granularity);
    const list = groups.get(info.key) ?? [];
    list.push(record);
    groups.set(info.key, list);

    const currentMeta = meta.get(info.key);
    if (!currentMeta || info.sortDate < currentMeta.sortDate) {
      meta.set(info.key, { label: info.label, sortDate: info.sortDate });
    }
  }

  return Array.from(groups.entries())
    .map(([periodKey, rows]) => {
      const summary = summarizeHomogeneityRecords(rows, goal);
      const periodMeta = meta.get(periodKey) ?? { label: periodKey, sortDate: periodKey };
      return {
        periodKey,
        periodLabel: periodMeta.label,
        sortDate: periodMeta.sortDate,
        totalRecords: summary.totalRecords,
        officialRecords: summary.officialRecords,
        unofficialRecords: summary.unofficialRecords,
        homogeneousRecords: summary.homogeneousRecords,
        nonHomogeneousRecords: summary.nonHomogeneousRecords,
        homogeneousPct: summary.homogeneousPct,
        goalPct: summary.goalPct,
        goalAttainmentPct: summary.goalAttainmentPct,
      };
    })
    .sort((left, right) => left.sortDate.localeCompare(right.sortDate));
}

function buildHomogeneityDistribution(records: PuntoAperturaRecord[]) {
  const total = records.length;
  const homogeneous = records.filter((record) => record.estado === "Homogeneo").length;
  const nonHomogeneous = total - homogeneous;
  return [
    {
      status: "Homogeneo" as const,
      count: homogeneous,
      pct: total > 0 ? (homogeneous / total) * 100 : 0,
    },
    {
      status: "No homogeneo" as const,
      count: nonHomogeneous,
      pct: total > 0 ? (nonHomogeneous / total) * 100 : 0,
    },
  ];
}

function buildHomogeneityNonConformityDetails(
  records: PuntoAperturaRecord[],
  goal: Awaited<ReturnType<typeof loadHomogeneityGoal>>,
): CampoPuntoAperturaHomogeneityNonConformityDetail[] {
  const groups = new Map<string, PuntoAperturaRecord[]>();
  for (const record of records) {
    if (!homogeneityGoalApplies(record, goal)) continue;
    const key = record.fecha;
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  }

  return Array.from(groups.entries())
    .map(([key, rows]) => {
      const homogeneousRecords = rows.filter((record) => record.estado === "Homogeneo").length;
      const totalRecords = rows.length;
      const nonHomogeneousRecords = totalRecords - homogeneousRecords;
      const homogeneousPct = totalRecords > 0 ? (homogeneousRecords / totalRecords) * 100 : null;
      return {
        key,
        fecha: rows[0]?.fecha ?? key,
        totalRecords,
        homogeneousRecords,
        nonHomogeneousRecords,
        homogeneousPct,
      };
    })
    .filter((row) => row.homogeneousPct !== null && goal.goalPct !== null && row.homogeneousPct < goal.goalPct)
    .sort((left, right) => right.fecha.localeCompare(left.fecha));
}

function buildHomogeneityBlockBreakdown(
  records: PuntoAperturaRecord[],
  goal: Awaited<ReturnType<typeof loadHomogeneityGoal>>,
): CampoPuntoAperturaHomogeneityBlockBreakdown[] {
  const groups = new Map<string, PuntoAperturaRecord[]>();
  for (const record of records) {
    const key = record.bloque || "Sin bloque";
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  }

  return Array.from(groups.entries())
    .map(([block, rows]) => {
      const summary = summarizeHomogeneityRecords(rows, goal);
      const nonConformityDetails = buildHomogeneityNonConformityDetails(rows, goal);
      return {
        block,
        totalRecords: summary.totalRecords,
        officialRecords: summary.officialRecords,
        unofficialRecords: summary.unofficialRecords,
        homogeneousRecords: summary.homogeneousRecords,
        nonHomogeneousRecords: summary.nonHomogeneousRecords,
        homogeneousPct: summary.homogeneousPct,
        goalPct: summary.goalPct,
        goalAttainmentPct: summary.goalAttainmentPct,
        nonConformingBlockDays: nonConformityDetails.length,
        totalBlockDays: new Set(rows.filter((record) => homogeneityGoalApplies(record, goal)).map((record) => record.fecha)).size,
        nonConformityDetails,
      };
    })
    .sort((left, right) => {
      if (left.homogeneousPct === null && right.homogeneousPct === null) return right.totalRecords - left.totalRecords;
      if (left.homogeneousPct === null) return 1;
      if (right.homogeneousPct === null) return -1;
      return right.homogeneousPct - left.homogeneousPct;
    });
}

function buildHomogeneityAreaBreakdown(
  records: PuntoAperturaRecord[],
  goal: Awaited<ReturnType<typeof loadHomogeneityGoal>>,
): CampoPuntoAperturaHomogeneityAreaBreakdown[] {
  const groups = new Map<string, PuntoAperturaRecord[]>();
  for (const record of records) {
    const key = record.area || "Sin area";
    const rows = groups.get(key) ?? [];
    rows.push(record);
    groups.set(key, rows);
  }

  return Array.from(groups.entries())
    .map(([area, rows]) => {
      const summary = summarizeHomogeneityRecords(rows, goal);
      const blocks = buildHomogeneityBlockBreakdown(rows, goal);
      return {
        area,
        totalRecords: summary.totalRecords,
        officialRecords: summary.officialRecords,
        unofficialRecords: summary.unofficialRecords,
        homogeneousRecords: summary.homogeneousRecords,
        nonHomogeneousRecords: summary.nonHomogeneousRecords,
        homogeneousPct: summary.homogeneousPct,
        goalPct: summary.goalPct,
        goalAttainmentPct: summary.goalAttainmentPct,
        nonConformingBlockDays: sum(blocks.map((block) => block.nonConformingBlockDays)),
        totalBlockDays: sum(blocks.map((block) => block.totalBlockDays)),
        blocks,
      };
    })
    .sort((left, right) => {
      if (left.homogeneousPct === null && right.homogeneousPct === null) return right.totalRecords - left.totalRecords;
      if (left.homogeneousPct === null) return 1;
      if (right.homogeneousPct === null) return -1;
      return right.homogeneousPct - left.homogeneousPct;
    });
}

function buildNotes(
  goal: Awaited<ReturnType<typeof loadOpeningGoal>>,
  summary: CampoPuntoAperturaKpiData["summary"],
) {
  const notes = [
    "Este frente usa la medicion historica de Calidad como fuente base y aplica la regla operativa vigente para traducirla a cumplimiento gerencial.",
    "Los periodos previos a la vigencia de la meta o sin regla operativa asociada se muestran como observacion historica y no cuentan dentro del KPI oficial.",
    "El cumplimiento ponderado usa el esquema 1 / 0.5 / 0.25 / 0.125 para premiar la cercania al punto de apertura esperado sin tratar por igual los desvios lejanos.",
  ];

  if (goal.goalPct !== null && goal.validFrom) {
    notes.push(`La meta activa se toma desde db_admin (${goal.targetCode}) con valor ${goal.goalPct.toFixed(2)}% y vigencia desde ${goal.validFrom}.`);
    if (goal.directGoalPct !== null && goal.directGoalPct !== goal.goalPct) {
      notes.push(`La meta exacta en la categoría objetivo sigue siendo ${goal.directGoalPct.toFixed(2)}%, pero el KPI oficial visible usa una meta ponderada inicial de ${goal.goalPct.toFixed(2)}%.`);
    }
  } else {
    notes.push("No se encontro una meta activa en db_admin; por eso la pantalla solo opera como observacion historica.");
  }

  if (summary.unofficialRecords > 0) {
    notes.push(`Hay ${summary.unofficialRecords} registro(s) visibles sin evaluacion oficial por quedar fuera de la vigencia o no encontrar regla operativa aplicable.`);
  }

  notes.push("Las no conformidades operativas por distribución se calculan aparte del KPI, por ahora aplican solo a XLE y todavía no salen del catálogo de metas; quedan documentadas como reglas pendientes de parametrización en el módulo.");

  return notes;
}

export function createEmptyCampoPuntoAperturaKpiData(
  filters: CampoPuntoAperturaKpiFilters = defaultCampoPuntoAperturaKpiFilters,
): CampoPuntoAperturaKpiData {
  return {
    generatedAt: new Date().toISOString(),
    filters,
    options: {
      isoWeeks: [],
      areas: [],
      spTypes: [],
      varieties: [],
      months: [],
      years: [],
      dominantClasses: [],
      bloques: [],
    },
    sourceSummary: {
      totalRecords: 0,
      totalCycles: 0,
      meanPct: 0,
      sdPct: 0,
      lowerLimitPct: 0,
      visibleMeanPct: 0,
      visibleSdPct: 0,
      homogeneousRecords: 0,
      nonHomogeneousRecords: 0,
      homogeneousPct: 0,
      dominantClass: "Sin datos",
      chartRecordLimit: 0,
    },
    goal: {
      targetCode: null,
      targetName: null,
      operatorCode: null,
      directGoalPct: null,
      goalPct: null,
      weightedSchemeCode: null,
      validFrom: null,
      validTo: null,
    },
    summary: {
      totalRecords: 0,
      officialRecords: 0,
      unofficialRecords: 0,
      totalStems: 0,
      officialStems: 0,
      unofficialStems: 0,
      weightedCompliancePct: null,
      directCompliancePct: null,
      goalPct: null,
      goalAttainmentPct: null,
      gapPct: null,
      targetCategoryLabel: null,
      officialCoveragePct: 0,
    },
    timeSeries: [],
    distribution: [],
    areas: [],
    nonConformities: {
      summary: {
        totalBlockDays: 0,
        nonConformingBlockDays: 0,
        conformingBlockDays: 0,
        nonConformityRatePct: null,
        topRuleLabel: null,
      },
      timeSeries: [],
      areas: [],
      records: [],
      rulesContextStatus: "pending-goals-catalog",
    },
    homogeneity: {
      goal: {
        targetCode: null,
        targetName: null,
        operatorCode: null,
        goalPct: null,
        validFrom: null,
        validTo: null,
      },
      summary: {
        totalRecords: 0,
        officialRecords: 0,
        unofficialRecords: 0,
        homogeneousRecords: 0,
        nonHomogeneousRecords: 0,
        homogeneousPct: null,
        goalPct: null,
        goalAttainmentPct: null,
      },
      timeSeries: [],
      distribution: [],
      areas: [],
    },
    notes: [],
  };
}

export async function getCampoPuntoAperturaKpiData(
  rawFilters: Partial<CampoPuntoAperturaKpiFilters> = {},
): Promise<CampoPuntoAperturaKpiData> {
  const filters = normalizeCampoPuntoAperturaKpiFilters(rawFilters);
  const qualityFilters: PuntoAperturaFilters = {
    isoWeek: filters.isoWeek,
    area: filters.area,
    spType: filters.spType,
    variety: filters.variety,
    month: filters.month,
    year: filters.year,
    date: filters.date,
    dominantClass: filters.dominantClass,
    bloque: filters.bloque,
  };

  const [sourceData, goal, homogeneityGoal, rules] = await Promise.all([
    getPuntoAperturaDashboardData(qualityFilters),
    loadOpeningGoal(),
    loadHomogeneityGoal(),
    loadOpeningRules(),
  ]);

  const evaluatedRecords = sourceData.records.map((record) => {
    const rule = resolveApplicableRule(record, rules);
    return evaluateRecord(record, rule, goal);
  });

  const summary = summarizeEvaluatedRecords(evaluatedRecords);
  const nonConformityRecords = buildNonConformityRecords(evaluatedRecords);
  const nonConformitySummary = summarizeNonConformities(nonConformityRecords);
  const homogeneitySummary = summarizeHomogeneityRecords(sourceData.records, homogeneityGoal);

  return {
    generatedAt: new Date().toISOString(),
    filters,
    options: sourceData.options,
    sourceSummary: sourceData.summary,
    goal,
    summary,
    timeSeries: buildTimeSeries(evaluatedRecords, filters.granularity),
    distribution: buildDistribution(evaluatedRecords),
    areas: buildAreaBreakdown(evaluatedRecords),
    nonConformities: {
      summary: nonConformitySummary,
      timeSeries: buildNonConformityTimeSeries(nonConformityRecords, filters.granularity),
      areas: buildNonConformityAreas(nonConformityRecords),
      records: nonConformityRecords.filter((record) => record.isNonConformity),
      rulesContextStatus: "pending-goals-catalog",
    },
    homogeneity: {
      goal: homogeneityGoal,
      summary: homogeneitySummary,
      timeSeries: buildHomogeneityTimeSeries(sourceData.records, filters.granularity, homogeneityGoal),
      distribution: buildHomogeneityDistribution(sourceData.records),
      areas: buildHomogeneityAreaBreakdown(sourceData.records, homogeneityGoal),
    },
    notes: buildNotes(goal, summary),
  };
}
