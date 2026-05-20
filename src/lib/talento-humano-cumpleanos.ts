import "server-only";

import { query } from "@/lib/db";
import { decodeMultiSelectValue, matchesMultiSelectValue } from "@/lib/multi-select";

type DbDate = string | Date | null;

export type CumpleanosFilters = {
  corteDate: string;       // YYYY-MM-DD, default hoy
  months: string;          // "all" | "1,2,12" multi-select encoded
  areaGeneral: string;     // "all" | "BOTÓN,FLOR" multi
  jobClassification: string;
  farmCode: string;
  jobTitle: string;
  q: string;
};

export type CumpleanosRow = {
  personId: string;
  personName: string;
  nationalId: string | null;
  areaId: string | null;
  areaName: string | null;
  areaGeneral: string | null;
  jobClassificationCode: string | null;
  jobTitle: string | null;
  farmCode: string | null;
  birthDate: string | null;       // YYYY-MM-DD
  birthDay: number;               // 1..31
  birthMonth: number;             // 1..12
  birthMonthLabel: string;        // "Enero"..."Diciembre"
};

export type CumpleanosOptions = {
  areaGenerals: string[];
  jobClassifications: string[];
  farmCodes: string[];
  jobTitles: string[];
};

export type CumpleanosSummary = {
  totalCollaborators: number;
  byMonth: Array<{ month: number; label: string; count: number }>; // 12 buckets siempre
  upcomingThisMonth: number;
  upcomingNext30Days: number;
};

export type CumpleanosData = {
  generatedAt: string;
  corteDate: string;
  filters: CumpleanosFilters;
  options: CumpleanosOptions;
  summary: CumpleanosSummary;
  rows: CumpleanosRow[];
};

export const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text && text !== "UNKNOWN" ? text : null;
}

function toDate(value: DbDate): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function normalizeMulti(value: string | undefined | null): string {
  if (!value) return "all";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "all") return "all";
  return trimmed;
}

export function normalizeCumpleanosFilters(
  raw: Record<string, string | undefined | null> = {},
): CumpleanosFilters {
  const today = new Date().toISOString().slice(0, 10);
  const rawCorte = (raw.corteDate ?? "").trim();
  const corteDate = ISO_DATE.test(rawCorte) ? rawCorte : today;
  return {
    corteDate,
    months: normalizeMulti(raw.months ?? null),
    areaGeneral: normalizeMulti(raw.areaGeneral ?? null),
    jobClassification: normalizeMulti(raw.jobClassification ?? null),
    farmCode: normalizeMulti(raw.farmCode ?? null),
    jobTitle: normalizeMulti(raw.jobTitle ?? null),
    q: (raw.q ?? "").trim(),
  };
}

type RawRow = {
  person_id: string;
  person_name: string | null;
  national_id: string | null;
  area_id: string | null;
  area_name: string | null;
  area_general: string | null;
  job_classification_code: string | null;
  job_title: string | null;
  farm_code: string | null;
  birth_date: string | null;
  birth_day: number | string | null;
  birth_month: number | string | null;
};

async function loadCumpleanosRows(corteDate: string): Promise<CumpleanosRow[]> {
  const result = await query<RawRow>(
    `
    WITH active_persons AS (
      SELECT DISTINCT ON (e.person_id) e.person_id, e.area_id
      FROM slv.tthh_asgn_person_area_event_scd2 e
      WHERE e.event_type = 'IS'
        AND e.is_current = true
        AND e.is_valid = true
        AND e.area_id <> 'UNKNOWN'
        AND $1::date >= e.valid_from::date
        AND $1::date < COALESCE(e.valid_to::date, DATE '9999-12-31')
      ORDER BY e.person_id, e.valid_from DESC
    ),
    profiles AS (
      SELECT DISTINCT ON (person_id)
        person_id, person_name, national_id, birth_date, job_title,
        job_classification_code, farm_code, contract_type
      FROM slv.tthh_dim_person_profile_scd2
      WHERE is_current = true AND is_valid = true
      ORDER BY person_id, valid_from DESC NULLS LAST
    )
    SELECT
      ap.person_id,
      COALESCE(p.person_name, ap.person_id) AS person_name,
      p.national_id,
      ap.area_id,
      ar.area_name,
      ar.area_general,
      p.job_classification_code,
      p.job_title,
      p.farm_code,
      to_char(p.birth_date, 'YYYY-MM-DD') AS birth_date,
      EXTRACT(day FROM p.birth_date)::int AS birth_day,
      EXTRACT(month FROM p.birth_date)::int AS birth_month
    FROM active_persons ap
    LEFT JOIN profiles p ON p.person_id = ap.person_id
    LEFT JOIN slv.camp_dim_area_profile_scd2 ar
      ON ar.area_id = ap.area_id AND ar.is_current = true AND ar.is_valid = true
    WHERE p.birth_date IS NOT NULL
      AND COALESCE(UPPER(p.contract_type), '') NOT LIKE '%SERVICIOS PRESTADOS%'
    ORDER BY EXTRACT(month FROM p.birth_date), EXTRACT(day FROM p.birth_date), p.person_name
    `,
    [corteDate],
  );

  return result.rows.map((row) => {
    const birthMonth = Math.max(1, Math.min(12, Math.round(toNumber(row.birth_month))));
    const birthDay = Math.max(1, Math.min(31, Math.round(toNumber(row.birth_day))));
    return {
      personId: row.person_id,
      personName: toText(row.person_name) ?? row.person_id,
      nationalId: toText(row.national_id),
      areaId: toText(row.area_id),
      areaName: toText(row.area_name),
      areaGeneral: toText(row.area_general),
      jobClassificationCode: toText(row.job_classification_code),
      jobTitle: toText(row.job_title),
      farmCode: toText(row.farm_code),
      birthDate: toDate(row.birth_date),
      birthDay,
      birthMonth,
      birthMonthLabel: MONTH_LABELS[birthMonth - 1] ?? "",
    };
  });
}

function searchTokens(q: string): string[] {
  return q.trim().split(/\s+/).filter(Boolean).slice(0, 6).map((token) => token.toLocaleLowerCase("es-EC"));
}

function rowMatchesSearch(row: CumpleanosRow, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const haystack = [row.personId, row.personName, row.nationalId, row.areaName]
    .filter((part): part is string => Boolean(part))
    .map((part) => part.toLocaleLowerCase("es-EC"))
    .join(" ");
  return tokens.every((token) => haystack.includes(token));
}

function rowMatchesMonth(row: CumpleanosRow, encoded: string): boolean {
  if (!encoded || encoded === "all") return true;
  const selected = decodeMultiSelectValue(encoded);
  if (selected.length === 0) return true;
  return selected.includes(String(row.birthMonth));
}

function rowMatchesAreaGeneral(row: CumpleanosRow, encoded: string): boolean {
  if (!encoded || encoded === "all") return true;
  const selected = decodeMultiSelectValue(encoded);
  if (selected.length === 0) return true;
  if (!row.areaGeneral) return false;
  return selected.includes(row.areaGeneral);
}

function buildOptions(rows: CumpleanosRow[]): CumpleanosOptions {
  const areaGenerals = new Set<string>();
  const jobClassifications = new Set<string>();
  const farmCodes = new Set<string>();
  const jobTitles = new Set<string>();

  for (const row of rows) {
    if (row.areaGeneral) areaGenerals.add(row.areaGeneral);
    if (row.jobClassificationCode) jobClassifications.add(row.jobClassificationCode);
    if (row.farmCode) farmCodes.add(row.farmCode);
    if (row.jobTitle) jobTitles.add(row.jobTitle);
  }

  return {
    areaGenerals: Array.from(areaGenerals).sort((a, b) => a.localeCompare(b, "es-EC")),
    jobClassifications: Array.from(jobClassifications).sort((a, b) => a.localeCompare(b, "es-EC")),
    farmCodes: Array.from(farmCodes).sort((a, b) => a.localeCompare(b, "es-EC")),
    jobTitles: Array.from(jobTitles).sort((a, b) => a.localeCompare(b, "es-EC")),
  };
}

export function computeUpcomingNext30Days(rows: CumpleanosRow[], corteDate: string): number {
  const corte = new Date(corteDate + "T00:00:00");
  const corteYear = corte.getFullYear();
  const cutoff = new Date(corte);
  cutoff.setDate(cutoff.getDate() + 30);

  let count = 0;
  for (const row of rows) {
    if (!row.birthDate) continue;
    const bMonth = row.birthMonth - 1; // 0-indexed
    const bDay = row.birthDay;

    // Try birthday this year
    let nextBirthday = new Date(corteYear, bMonth, bDay);
    // If this year's birthday has already passed (strictly before corteDate), use next year
    if (nextBirthday < corte) {
      nextBirthday = new Date(corteYear + 1, bMonth, bDay);
    }

    // Check if nextBirthday is within [corteDate, corteDate+30]
    if (nextBirthday >= corte && nextBirthday <= cutoff) {
      count += 1;
    }
  }
  return count;
}

function buildSummary(rows: CumpleanosRow[], corteDate: string): CumpleanosSummary {
  const corteMonth = new Date(corteDate + "T00:00:00").getMonth() + 1; // 1-indexed

  const byMonth = MONTH_LABELS.map((label, index) => ({
    month: index + 1,
    label,
    count: rows.filter((r) => r.birthMonth === index + 1).length,
  }));

  const upcomingThisMonth = rows.filter((r) => r.birthMonth === corteMonth).length;
  const upcomingNext30Days = computeUpcomingNext30Days(rows, corteDate);

  return {
    totalCollaborators: rows.length,
    byMonth,
    upcomingThisMonth,
    upcomingNext30Days,
  };
}

export async function getCumpleanosData(
  filters: CumpleanosFilters,
): Promise<CumpleanosData> {
  const normalized = normalizeCumpleanosFilters({
    corteDate: filters.corteDate,
    months: filters.months,
    areaGeneral: filters.areaGeneral,
    jobClassification: filters.jobClassification,
    farmCode: filters.farmCode,
    jobTitle: filters.jobTitle,
    q: filters.q,
  });

  const allRows = await loadCumpleanosRows(normalized.corteDate);
  const options = buildOptions(allRows);

  const tokens = searchTokens(normalized.q);
  const filteredRows = allRows.filter(
    (row) =>
      rowMatchesMonth(row, normalized.months) &&
      rowMatchesAreaGeneral(row, normalized.areaGeneral) &&
      matchesMultiSelectValue(normalized.jobClassification, row.jobClassificationCode) &&
      matchesMultiSelectValue(normalized.farmCode, row.farmCode) &&
      matchesMultiSelectValue(normalized.jobTitle, row.jobTitle) &&
      rowMatchesSearch(row, tokens),
  );

  return {
    generatedAt: new Date().toISOString(),
    corteDate: normalized.corteDate,
    filters: normalized,
    options,
    summary: buildSummary(filteredRows, normalized.corteDate),
    rows: filteredRows,
  };
}
