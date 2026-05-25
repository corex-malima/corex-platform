import "server-only";

import { query } from "@/lib/db";
import { decodeMultiSelectValue } from "@/lib/multi-select";
import { cachedAsync } from "@/lib/server-cache";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos (contrato v3 — granularidad cycle_key + día vegetativo)
// ─────────────────────────────────────────────────────────────────────────────

export type AlturasDronFilters = {
  dateFrom: string;       // ISO YYYY-MM-DD
  dateTo: string;         // ISO YYYY-MM-DD
  block: string;          // "all" | "303,304,..." encoded multi (parent_block)
  cycleKey: string;       // "all" | "MH1-303-2024,..." encoded multi (nuevo)
  variety: string;        // "all" | "FREEDOM,..." encoded multi
  spType: string;         // "all" | "P1,P2,P3..." encoded multi (nuevo)
  areaId: string;         // "all" | "A1,B2,..." encoded multi (nuevo)
  vegDayFrom: string;     // entero como string o "" (nuevo)
  vegDayTo: string;       // entero como string o "" (nuevo)
  q: string;              // búsqueda libre sobre parent_block
};

// 1 row por (cycle_key, event_date) — fuente: slv.camp_fact_drone_statistics_cur
// enriquecido con JOIN LATERAL a slv.camp_dim_cycle_profile_scd2
export type AlturasDronStatsRow = {
  eventDate: string;           // YYYY-MM-DD
  cycleKey: string;            // clave del ciclo (ahora obligatoria, no null)
  parentBlock: string;
  blockId: string | null;
  variety: string | null;
  spType: string | null;       // P1, P2, P3... (nuevo)
  areaId: string | null;       // área del ciclo (nuevo)
  spDate: string | null;       // fecha siembra/plantación (nuevo)
  harvestStartDate: string | null; // inicio cosecha del ciclo
  harvestEndDate: string | null;   // fin cosecha del ciclo
  vegetativeDay: number | null; // (eventDate - spDate + 1) (nuevo)

  // Medidas centrales
  mean: number;       // e_x
  median: number | null; // me_x
  sd: number | null;  // s_x

  // Dispersión absoluta
  iqr: number | null;    // iqr_x (Q3-Q1)
  mad: number | null;    // mad_x
  rSiqr: number | null;  // r_siqr_x (IQR / 1.349)
  rSmad: number | null;  // r_smad_x (1.4826 * MAD)

  // Heterogeneidad relativa
  cv: number | null;     // cv_x = S/E
  rCviqr: number | null; // r_cviqr_x
  rCvmad: number | null; // r_cvmad_x

  // Percentiles
  p10: number | null;  // q0_1_x (solo disponible vía height_ranges_cur)
  p25: number | null;  // q0_25_x
  p75: number | null;  // q0_75_x
  p90: number | null;  // q0_9_x

  // Asimetría
  bowleyV1: number | null; // sesgo_bowley_v1 (P10/P90)
  bowleyV2: number | null; // sesgo_bowley_v2 (Q1/Q3)
  fisher: number | null;   // sesgo_fisher

  // Desigualdad y entropía
  gini: number | null;         // g
  entropyNorm: number | null;  // hn
};

// 1 row por (cycle_key, event_date, altura_m) — para el histograma con scrubber
export type AlturasDronRangeRow = {
  eventDate: string;          // YYYY-MM-DD
  cycleKey: string;           // ciclo (cambiado: ahora va por cycle_key)
  parentBlock: string;        // sigue, informativo
  vegetativeDay: number | null; // computado con sp_date del ciclo (nuevo)
  alturaM: number;            // bin (cabecera del rango)
  distPrc: number;            // % en ese bin
};

export type AlturasDronOptions = {
  blocks: string[];    // distinct parent_block
  cycles: string[];    // cycle_keys disponibles (nuevo)
  varieties: string[];
  spTypes: string[];   // nuevo
  areas: string[];     // nuevo
};

export type AlturasDronSummary = {
  totalDates: number;
  totalCycles: number;      // distinct cycle_key (cambio: por ciclos, no bloques)
  totalBlocks: number;      // distinct parent_block (informativo)
  lastDate: string | null;
  // Últimas mediciones (sobre lastDate)
  avgMeanLastDate: number | null;
  avgMedianLastDate: number | null;
  avgCvLastDate: number | null;
  avgGiniLastDate: number | null;
  avgEntropyLastDate: number | null;
  highCvCycleCount: number; // cycles con cv > 0.40 en última fecha (cambio)
};

export type AlturasDronData = {
  generatedAt: string;
  filters: AlturasDronFilters;
  options: AlturasDronOptions;
  summary: AlturasDronSummary;
  stats: AlturasDronStatsRow[];  // ordenado por cycleKey, eventDate ASC
  ranges: AlturasDronRangeRow[]; // ordenado por cycleKey, eventDate ASC, alturaM ASC
};

// ─────────────────────────────────────────────────────────────────────────────
// Defaults y normalización
// ─────────────────────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function normalizeDate(value: string | null | undefined, fallback: () => string): string {
  const trimmed = (value ?? "").trim();
  return ISO_DATE.test(trimmed) ? trimmed : fallback();
}

function normalizeMulti(value: string | null | undefined): string {
  if (!value) return "all";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "all") return "all";
  return trimmed;
}

function normalizeIntString(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) ? String(n) : "";
}

export const defaultAlturasDronFilters: AlturasDronFilters = {
  dateFrom: daysAgoIso(90),
  dateTo: todayIso(),
  block: "all",
  cycleKey: "all",
  variety: "all",
  spType: "all",
  areaId: "all",
  vegDayFrom: "",
  vegDayTo: "",
  q: "",
};

export function normalizeAlturasDronFilters(
  raw: Partial<AlturasDronFilters> = {},
): AlturasDronFilters {
  return {
    dateFrom: normalizeDate(raw.dateFrom, () => daysAgoIso(90)),
    dateTo: normalizeDate(raw.dateTo, () => todayIso()),
    block: normalizeMulti(raw.block),
    cycleKey: normalizeMulti(raw.cycleKey),
    variety: normalizeMulti(raw.variety),
    spType: normalizeMulti(raw.spType),
    areaId: normalizeMulti(raw.areaId),
    vegDayFrom: normalizeIntString(raw.vegDayFrom),
    vegDayTo: normalizeIntString(raw.vegDayTo),
    q: (raw.q ?? "").trim(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de conversión
// ─────────────────────────────────────────────────────────────────────────────

function toTextArrayParam(value: string): string[] | null {
  const decoded = decodeMultiSelectValue(value);
  return decoded.length > 0 ? decoded : null;
}

function toFloat(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toFloatRequired(value: unknown): number {
  return toFloat(value) ?? 0;
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary (exportada como función pura para tests)
// ─────────────────────────────────────────────────────────────────────────────

export function computeAlturasDronSummary(rows: AlturasDronStatsRow[]): AlturasDronSummary {
  if (rows.length === 0) {
    return {
      totalDates: 0,
      totalCycles: 0,
      totalBlocks: 0,
      lastDate: null,
      avgMeanLastDate: null,
      avgMedianLastDate: null,
      avgCvLastDate: null,
      avgGiniLastDate: null,
      avgEntropyLastDate: null,
      highCvCycleCount: 0,
    };
  }

  const uniqueDates = new Set(rows.map((r) => r.eventDate));
  const uniqueCycles = new Set(rows.map((r) => r.cycleKey));
  const uniqueBlocks = new Set(rows.map((r) => r.parentBlock));

  const sortedDates = [...uniqueDates].sort();
  const lastDate = sortedDates[sortedDates.length - 1] ?? null;

  const lastRows = lastDate ? rows.filter((r) => r.eventDate === lastDate) : [];

  function avgOf(values: (number | null)[]): number | null {
    const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
    return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  }

  const roundTo = (v: number | null, precision: number): number | null => {
    if (v === null) return null;
    const factor = Math.pow(10, precision);
    return Math.round(v * factor) / factor;
  };

  const avgMeanLastDate = roundTo(avgOf(lastRows.map((r) => r.mean)), 4);
  const avgMedianLastDate = roundTo(avgOf(lastRows.map((r) => r.median)), 4);
  const avgCvLastDate = roundTo(avgOf(lastRows.map((r) => r.cv)), 4);
  const avgGiniLastDate = roundTo(avgOf(lastRows.map((r) => r.gini)), 4);
  const avgEntropyLastDate = roundTo(avgOf(lastRows.map((r) => r.entropyNorm)), 4);
  const highCvCycleCount = lastRows.filter((r) => (r.cv ?? 0) > 0.4).length;

  return {
    totalDates: uniqueDates.size,
    totalCycles: uniqueCycles.size,
    totalBlocks: uniqueBlocks.size,
    lastDate,
    avgMeanLastDate,
    avgMedianLastDate,
    avgCvLastDate,
    avgGiniLastDate,
    avgEntropyLastDate,
    highCvCycleCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Options (derivadas de los rows cargados — sin query extra)
// ─────────────────────────────────────────────────────────────────────────────

function buildOptions(rows: AlturasDronStatsRow[]): AlturasDronOptions {
  const blocks = [...new Set(rows.map((r) => r.parentBlock))].sort((a, b) =>
    a.localeCompare(b, "es-EC"),
  );
  const cycles = [...new Set(rows.map((r) => r.cycleKey))].sort((a, b) =>
    a.localeCompare(b, "es-EC"),
  );
  const varieties = [
    ...new Set(rows.map((r) => r.variety).filter((v): v is string => v !== null)),
  ].sort((a, b) => a.localeCompare(b, "es-EC"));
  const spTypes = [
    ...new Set(rows.map((r) => r.spType).filter((v): v is string => v !== null)),
  ].sort((a, b) => a.localeCompare(b, "es-EC"));
  const areas = [
    ...new Set(rows.map((r) => r.areaId).filter((v): v is string => v !== null)),
  ].sort((a, b) => a.localeCompare(b, "es-EC"));
  return { blocks, cycles, varieties, spTypes, areas };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos raw DB
// ─────────────────────────────────────────────────────────────────────────────

type RawStatsRow = {
  event_date: string;
  cycle_key: string;
  parent_block: string;
  block_id: string | null;
  variety: string | null;
  sp_type: string | null;
  area_id: string | null;
  sp_date: string | null;
  harvest_start_date: string | null;
  harvest_end_date: string | null;
  vegetative_day: string | number | null;
  mean: string | number | null;
  median: string | number | null;
  sd: string | number | null;
  iqr: string | number | null;
  mad: string | number | null;
  r_siqr: string | number | null;
  r_smad: string | number | null;
  cv: string | number | null;
  r_cviqr: string | number | null;
  r_cvmad: string | number | null;
  p10: string | number | null;
  p25: string | number | null;
  p75: string | number | null;
  p90: string | number | null;
  bowley_v1: string | number | null;
  bowley_v2: string | number | null;
  fisher: string | number | null;
  gini: string | number | null;
  entropy_norm: string | number | null;
};

type RawRangeRow = {
  event_date: string;
  cycle_key: string;
  parent_block: string;
  sp_date: string | null;
  altura_m: number;
  dist_prc: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// SQL builders
// ─────────────────────────────────────────────────────────────────────────────

// Primary: statistics_cur con DISTINCT ON (event_date, cycle_key) +
// LEFT JOIN LATERAL a slv.camp_dim_cycle_profile_scd2 para obtener
// sp_date, sp_type, variety, area_id y calcular vegetative_day.
async function queryStatsFromStatisticsCur(
  dateFrom: string,
  dateTo: string,
  blocksParam: string[] | null,
  cyclesParam: string[] | null,
): Promise<RawStatsRow[]> {
  const sql = `
    WITH base AS (
      SELECT DISTINCT ON (event_date, cycle_key)
        to_char(event_date::date, 'YYYY-MM-DD') AS event_date,
        cycle_key,
        parent_block,
        block_id,
        e_x         AS mean,
        me_x        AS median,
        s_x         AS sd,
        NULL::float8 AS iqr,
        NULL::float8 AS mad,
        r_siqr_x    AS r_siqr,
        r_smad_x    AS r_smad,
        cv_x        AS cv,
        r_cviqr_x   AS r_cviqr,
        r_cvmad_x   AS r_cvmad,
        NULL::float8 AS p10,
        NULL::float8 AS p25,
        NULL::float8 AS p75,
        NULL::float8 AS p90,
        sesgo_bowley_v1 AS bowley_v1,
        sesgo_bowley_v2 AS bowley_v2,
        sesgo_fisher    AS fisher,
        g               AS gini,
        hn              AS entropy_norm
      FROM slv.camp_fact_drone_statistics_cur
      WHERE event_date BETWEEN $1::date AND $2::date
        AND ($3::text[] IS NULL OR parent_block = ANY($3::text[]))
        AND ($4::text[] IS NULL OR cycle_key = ANY($4::text[]))
      ORDER BY event_date, cycle_key, event_at DESC
    ),
    filtered AS (
      SELECT
        b.event_date,
        b.cycle_key,
        b.parent_block,
        b.block_id,
        b.mean,
        b.median,
        b.sd,
        b.iqr,
        b.mad,
        b.r_siqr,
        b.r_smad,
        b.cv,
        b.r_cviqr,
        b.r_cvmad,
        b.p10,
        b.p25,
        b.p75,
        b.p90,
        b.bowley_v1,
        b.bowley_v2,
        b.fisher,
        b.gini,
        b.entropy_norm,
        to_char(profile.sp_date, 'YYYY-MM-DD') AS sp_date,
        profile.sp_type,
        profile.variety,
        profile.area_id,
        to_char(profile.harvest_start_date, 'YYYY-MM-DD') AS harvest_start_date,
        to_char(profile.harvest_end_date, 'YYYY-MM-DD') AS harvest_end_date,
        CASE
          WHEN profile.sp_date IS NULL THEN NULL
          ELSE (b.event_date::date - profile.sp_date + 1)::int
        END AS vegetative_day
      FROM base b
      LEFT JOIN LATERAL (
        SELECT
          cp.sp_date,
          cp.sp_type,
          cp.variety,
          cp.area_id,
          cp.harvest_start_date,
          cp.harvest_end_date
        FROM slv.camp_dim_cycle_profile_scd2 cp
        WHERE cp.cycle_key = b.cycle_key
          AND cp.is_valid = true
        ORDER BY cp.valid_from DESC NULLS LAST
        LIMIT 1
      ) profile ON true
      WHERE
        profile.sp_date IS NULL
        OR (
          b.event_date::date >= profile.sp_date
          AND b.event_date::date <= COALESCE(
            profile.harvest_end_date,
            profile.harvest_start_date + INTERVAL '180 days',
            CURRENT_DATE
          )::date
        )
    )
    SELECT * FROM filtered
    ORDER BY cycle_key, event_date
  `;
  const result = await query<RawStatsRow>(sql, [dateFrom, dateTo, blocksParam, cyclesParam]);
  return result.rows;
}

// Fallback: derivar stats desde ranges_cur con DISTINCT ON (event_date, cycle_key).
// Esta tabla tiene TODOS los campos (percentiles, iqr, mad, etc.)
// Agrega el mismo JOIN LATERAL a scd2 para vegetative_day.
async function queryStatsFromRangesCur(
  dateFrom: string,
  dateTo: string,
  blocksParam: string[] | null,
  cyclesParam: string[] | null,
): Promise<RawStatsRow[]> {
  const sql = `
    WITH stats AS (
      SELECT DISTINCT ON (event_date, cycle_key)
        to_char(event_date::date, 'YYYY-MM-DD') AS event_date,
        cycle_key,
        parent_block,
        block_id,
        e_x         AS mean,
        me_x        AS median,
        s_x         AS sd,
        iqr_x       AS iqr,
        mad_x       AS mad,
        r_siqr_x    AS r_siqr,
        r_smad_x    AS r_smad,
        cv_x        AS cv,
        r_cviqr_x   AS r_cviqr,
        r_cvmad_x   AS r_cvmad,
        q0_1_x      AS p10,
        q0_25_x     AS p25,
        q0_75_x     AS p75,
        q0_9_x      AS p90,
        sesgo_bowley_v1 AS bowley_v1,
        sesgo_bowley_v2 AS bowley_v2,
        sesgo_fisher    AS fisher,
        g               AS gini,
        hn              AS entropy_norm
      FROM slv.camp_fact_drone_height_ranges_cur
      WHERE event_date BETWEEN $1::date AND $2::date
        AND ($3::text[] IS NULL OR parent_block = ANY($3::text[]))
        AND ($4::text[] IS NULL OR cycle_key = ANY($4::text[]))
      ORDER BY event_date, cycle_key, event_at DESC
    ),
    filtered AS (
      SELECT
        s.event_date,
        s.cycle_key,
        s.parent_block,
        s.block_id,
        s.mean,
        s.median,
        s.sd,
        s.iqr,
        s.mad,
        s.r_siqr,
        s.r_smad,
        s.cv,
        s.r_cviqr,
        s.r_cvmad,
        s.p10,
        s.p25,
        s.p75,
        s.p90,
        s.bowley_v1,
        s.bowley_v2,
        s.fisher,
        s.gini,
        s.entropy_norm,
        to_char(profile.sp_date, 'YYYY-MM-DD') AS sp_date,
        profile.sp_type,
        profile.variety,
        profile.area_id,
        to_char(profile.harvest_start_date, 'YYYY-MM-DD') AS harvest_start_date,
        to_char(profile.harvest_end_date, 'YYYY-MM-DD') AS harvest_end_date,
        CASE
          WHEN profile.sp_date IS NULL THEN NULL
          ELSE (s.event_date::date - profile.sp_date + 1)::int
        END AS vegetative_day
      FROM stats s
      LEFT JOIN LATERAL (
        SELECT
          cp.sp_date,
          cp.sp_type,
          cp.variety,
          cp.area_id,
          cp.harvest_start_date,
          cp.harvest_end_date
        FROM slv.camp_dim_cycle_profile_scd2 cp
        WHERE cp.cycle_key = s.cycle_key
          AND cp.is_valid = true
        ORDER BY cp.valid_from DESC NULLS LAST
        LIMIT 1
      ) profile ON true
      WHERE
        profile.sp_date IS NULL
        OR (
          s.event_date::date >= profile.sp_date
          AND s.event_date::date <= COALESCE(
            profile.harvest_end_date,
            profile.harvest_start_date + INTERVAL '180 days',
            CURRENT_DATE
          )::date
        )
    )
    SELECT * FROM filtered
    ORDER BY cycle_key, event_date
  `;
  const result = await query<RawStatsRow>(sql, [dateFrom, dateTo, blocksParam, cyclesParam]);
  return result.rows;
}

// Try statistics_cur first; fall back to ranges_cur on error
async function loadStats(
  dateFrom: string,
  dateTo: string,
  blocksParam: string[] | null,
  cyclesParam: string[] | null,
): Promise<RawStatsRow[]> {
  try {
    return await queryStatsFromStatisticsCur(dateFrom, dateTo, blocksParam, cyclesParam);
  } catch (err) {
    console.warn("[alturas-dron] statistics_cur falló, derivando de ranges_cur:", err);
    return await queryStatsFromRangesCur(dateFrom, dateTo, blocksParam, cyclesParam);
  }
}

function mapRawStats(raw: RawStatsRow): AlturasDronStatsRow {
  return {
    eventDate: raw.event_date,
    cycleKey: raw.cycle_key ?? "",
    parentBlock: raw.parent_block,
    blockId: raw.block_id,
    variety: raw.variety,
    spType: raw.sp_type,
    areaId: raw.area_id,
    spDate: raw.sp_date,
    harvestStartDate: raw.harvest_start_date,
    harvestEndDate: raw.harvest_end_date,
    vegetativeDay: toIntOrNull(raw.vegetative_day),
    mean: toFloatRequired(raw.mean),
    median: toFloat(raw.median),
    sd: toFloat(raw.sd),
    iqr: toFloat(raw.iqr),
    mad: toFloat(raw.mad),
    rSiqr: toFloat(raw.r_siqr),
    rSmad: toFloat(raw.r_smad),
    cv: toFloat(raw.cv),
    rCviqr: toFloat(raw.r_cviqr),
    rCvmad: toFloat(raw.r_cvmad),
    p10: toFloat(raw.p10),
    p25: toFloat(raw.p25),
    p75: toFloat(raw.p75),
    p90: toFloat(raw.p90),
    bowleyV1: toFloat(raw.bowley_v1),
    bowleyV2: toFloat(raw.bowley_v2),
    fisher: toFloat(raw.fisher),
    gini: toFloat(raw.gini),
    entropyNorm: toFloat(raw.entropy_norm),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader principal (cacheado)
// ─────────────────────────────────────────────────────────────────────────────

const TTL_MS = 60 * 1000;

export async function getAlturasDronData(
  rawFilters: Partial<AlturasDronFilters> = defaultAlturasDronFilters,
): Promise<AlturasDronData> {
  const filters = normalizeAlturasDronFilters(rawFilters);
  const cacheKey = `campo-alturas-dron:v3:${filters.dateFrom}:${filters.dateTo}:${filters.block}:${filters.cycleKey}:${filters.variety}:${filters.spType}:${filters.areaId}:${filters.vegDayFrom}:${filters.vegDayTo}:${filters.q}`;

  return cachedAsync(cacheKey, TTL_MS, async () => {
    const blocksParam = toTextArrayParam(filters.block);
    const cyclesParam = toTextArrayParam(filters.cycleKey);

    // Ranges: todas las fechas del rango (para histograma con scrubber).
    // Agrega JOIN LATERAL a scd2 para obtener sp_date → vegetative_day.
    // Solo incluye mediciones dentro del ciclo (event_date >= sp_date y <= harvest_end_date).
    const rangesSql = `
      SELECT
        to_char(r.event_date::date, 'YYYY-MM-DD') AS event_date,
        r.cycle_key,
        r.parent_block,
        to_char(profile.sp_date, 'YYYY-MM-DD') AS sp_date,
        r.altura_m::float8 AS altura_m,
        r.dist_prc::float8 AS dist_prc
      FROM slv.camp_fact_drone_height_ranges_cur r
      LEFT JOIN LATERAL (
        SELECT
          cp.sp_date,
          cp.harvest_start_date,
          cp.harvest_end_date
        FROM slv.camp_dim_cycle_profile_scd2 cp
        WHERE cp.cycle_key = r.cycle_key
          AND cp.is_valid = true
        ORDER BY cp.valid_from DESC NULLS LAST
        LIMIT 1
      ) profile ON true
      WHERE r.event_date BETWEEN $1::date AND $2::date
        AND ($3::text[] IS NULL OR r.parent_block = ANY($3::text[]))
        AND ($4::text[] IS NULL OR r.cycle_key = ANY($4::text[]))
        AND (
          profile.sp_date IS NULL
          OR (
            r.event_date::date >= profile.sp_date
            AND r.event_date::date <= COALESCE(
              profile.harvest_end_date,
              profile.harvest_start_date + INTERVAL '180 days',
              CURRENT_DATE
            )::date
          )
        )
      ORDER BY r.cycle_key, r.event_date, r.altura_m
    `;

    const [rawStats, rangesResult] = await Promise.all([
      loadStats(filters.dateFrom, filters.dateTo, blocksParam, cyclesParam),
      query<RawRangeRow>(rangesSql, [filters.dateFrom, filters.dateTo, blocksParam, cyclesParam]),
    ]);

    const statsRows: AlturasDronStatsRow[] = rawStats.map(mapRawStats);

    // ── Filtros post-SQL (aplicados sobre datos ya enriquecidos con scd2) ──

    // Filtro por variety (multi)
    const varietyTokens = decodeMultiSelectValue(filters.variety);
    let filteredStats =
      varietyTokens.length > 0
        ? statsRows.filter((r) => r.variety !== null && varietyTokens.includes(r.variety))
        : statsRows;

    // Filtro por spType (multi)
    const spTypeTokens = decodeMultiSelectValue(filters.spType);
    if (spTypeTokens.length > 0) {
      filteredStats = filteredStats.filter(
        (r) => r.spType !== null && spTypeTokens.includes(r.spType),
      );
    }

    // Filtro por areaId (multi)
    const areaIdTokens = decodeMultiSelectValue(filters.areaId);
    if (areaIdTokens.length > 0) {
      filteredStats = filteredStats.filter(
        (r) => r.areaId !== null && areaIdTokens.includes(r.areaId),
      );
    }

    // Filtro por rango de día vegetativo
    const vegDayFromNum = filters.vegDayFrom ? parseInt(filters.vegDayFrom, 10) : null;
    const vegDayToNum = filters.vegDayTo ? parseInt(filters.vegDayTo, 10) : null;
    if (vegDayFromNum !== null && Number.isFinite(vegDayFromNum)) {
      filteredStats = filteredStats.filter(
        (r) => r.vegetativeDay !== null && r.vegetativeDay >= vegDayFromNum,
      );
    }
    if (vegDayToNum !== null && Number.isFinite(vegDayToNum)) {
      filteredStats = filteredStats.filter(
        (r) => r.vegetativeDay !== null && r.vegetativeDay <= vegDayToNum,
      );
    }

    // Options derivadas ANTES del filtro q (para que el selector muestre todos)
    const options = buildOptions(filteredStats);

    // Filtro post-SQL por búsqueda libre sobre parent_block
    const qTokens = filters.q
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toLocaleLowerCase("es-EC"));

    const finalStats =
      qTokens.length > 0
        ? filteredStats.filter((r) =>
            qTokens.every((t) => r.parentBlock.toLocaleLowerCase("es-EC").includes(t)),
          )
        : filteredStats;

    // Mapear ranges con vegetative_day calculado
    const rangesRows: AlturasDronRangeRow[] = rangesResult.rows.map((r) => {
      const spDate = r.sp_date ?? null;
      let vegetativeDay: number | null = null;
      if (spDate) {
        const diff =
          new Date(r.event_date).getTime() - new Date(spDate).getTime();
        const days = Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
        vegetativeDay = Number.isFinite(days) ? days : null;
      }
      return {
        eventDate: r.event_date,
        cycleKey: r.cycle_key ?? "",
        parentBlock: r.parent_block,
        vegetativeDay,
        alturaM: toFloatRequired(r.altura_m),
        distPrc: toFloatRequired(r.dist_prc),
      };
    });

    // Filter ranges by the same cycles as the final stats (after all filters)
    const finalCycles = new Set(finalStats.map((r) => r.cycleKey));
    const filteredRanges = rangesRows.filter((r) => finalCycles.has(r.cycleKey));

    const summary = computeAlturasDronSummary(finalStats);

    return {
      generatedAt: new Date().toISOString(),
      filters,
      options,
      summary,
      stats: finalStats,
      ranges: filteredRanges,
    };
  });
}
