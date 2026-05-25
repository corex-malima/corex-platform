import "server-only";

import { query } from "@/lib/db";
import { decodeMultiSelectValue } from "@/lib/multi-select";
import { cachedAsync } from "@/lib/server-cache";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos (contrato v2 — Castillo)
// ─────────────────────────────────────────────────────────────────────────────

export type AlturasDronFilters = {
  dateFrom: string; // ISO YYYY-MM-DD
  dateTo: string; // ISO YYYY-MM-DD
  block: string; // "all" | "303,304,..." encoded multi
  variety: string; // "all" | "FREEDOM,..." encoded multi
  q: string; // búsqueda libre sobre block
};

// 1 row por (block, date) — fuente: slv.camp_fact_drone_statistics_cur
// con fallback derivado de slv.camp_fact_drone_height_ranges_cur
export type AlturasDronStatsRow = {
  eventDate: string; // YYYY-MM-DD
  parentBlock: string;
  blockId: string | null;
  cycleKey: string | null;
  variety: string | null;

  // Medidas centrales
  mean: number; // e_x
  median: number | null; // me_x
  sd: number | null; // s_x

  // Dispersión absoluta
  iqr: number | null; // iqr_x (Q3-Q1)
  mad: number | null; // mad_x
  rSiqr: number | null; // r_siqr_x (IQR / 1.349)
  rSmad: number | null; // r_smad_x (1.4826 * MAD)

  // Heterogeneidad relativa
  cv: number | null; // cv_x = S/E
  rCviqr: number | null; // r_cviqr_x
  rCvmad: number | null; // r_cvmad_x

  // Percentiles
  p10: number | null; // q_0_1_x
  p25: number | null; // q_0_25_x
  p75: number | null; // q_0_75_x
  p90: number | null; // q_0_9_x

  // Asimetría
  bowleyV1: number | null; // sesgo_bowley_v1 (P10/P90)
  bowleyV2: number | null; // sesgo_bowley_v2 (Q1/Q3)
  fisher: number | null; // sesgo_fisher

  // Desigualdad y entropía
  gini: number | null; // g
  entropyNorm: number | null; // hn
};

// 1 row por (block, date, altura_m) — para el histograma con scrubber
export type AlturasDronRangeRow = {
  eventDate: string; // YYYY-MM-DD
  parentBlock: string;
  alturaM: number; // bin (cabecera del rango)
  distPrc: number; // % en ese bin
};

export type AlturasDronOptions = {
  blocks: string[];
  varieties: string[];
};

export type AlturasDronSummary = {
  totalDates: number;
  totalBlocks: number;
  lastDate: string | null;
  // Últimas mediciones (sobre lastDate)
  avgMeanLastDate: number | null; // mean(e_x)
  avgMedianLastDate: number | null; // mean(me_x)
  avgCvLastDate: number | null;
  avgGiniLastDate: number | null;
  avgEntropyLastDate: number | null;
  highCvBlockCount: number; // bloques con cv > 0.40 en última fecha
};

export type AlturasDronData = {
  generatedAt: string;
  filters: AlturasDronFilters;
  options: AlturasDronOptions;
  summary: AlturasDronSummary;
  stats: AlturasDronStatsRow[]; // ordenado por parentBlock, eventDate ASC
  ranges: AlturasDronRangeRow[]; // ordenado por parentBlock, eventDate ASC, alturaM ASC
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

export const defaultAlturasDronFilters: AlturasDronFilters = {
  dateFrom: daysAgoIso(90),
  dateTo: todayIso(),
  block: "all",
  variety: "all",
  q: "",
};

export function normalizeAlturasDronFilters(
  raw: Partial<AlturasDronFilters> = {},
): AlturasDronFilters {
  return {
    dateFrom: normalizeDate(raw.dateFrom, () => daysAgoIso(90)),
    dateTo: normalizeDate(raw.dateTo, () => todayIso()),
    block: normalizeMulti(raw.block),
    variety: normalizeMulti(raw.variety),
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

// ─────────────────────────────────────────────────────────────────────────────
// Summary (exportada como función pura para tests)
// ─────────────────────────────────────────────────────────────────────────────

export function computeAlturasDronSummary(rows: AlturasDronStatsRow[]): AlturasDronSummary {
  if (rows.length === 0) {
    return {
      totalDates: 0,
      totalBlocks: 0,
      lastDate: null,
      avgMeanLastDate: null,
      avgMedianLastDate: null,
      avgCvLastDate: null,
      avgGiniLastDate: null,
      avgEntropyLastDate: null,
      highCvBlockCount: 0,
    };
  }

  const uniqueDates = new Set(rows.map((r) => r.eventDate));
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
  const highCvBlockCount = lastRows.filter((r) => (r.cv ?? 0) > 0.4).length;

  return {
    totalDates: uniqueDates.size,
    totalBlocks: uniqueBlocks.size,
    lastDate,
    avgMeanLastDate,
    avgMedianLastDate,
    avgCvLastDate,
    avgGiniLastDate,
    avgEntropyLastDate,
    highCvBlockCount,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Options (derivadas de los rows cargados — sin query extra)
// ─────────────────────────────────────────────────────────────────────────────

function buildOptions(rows: AlturasDronStatsRow[]): AlturasDronOptions {
  const blocks = [...new Set(rows.map((r) => r.parentBlock))].sort((a, b) =>
    a.localeCompare(b, "es-EC"),
  );
  const varieties = [
    ...new Set(rows.map((r) => r.variety).filter((v): v is string => v !== null)),
  ].sort((a, b) => a.localeCompare(b, "es-EC"));
  return { blocks, varieties };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos raw DB
// ─────────────────────────────────────────────────────────────────────────────

type RawStatsRow = {
  event_date: string;
  parent_block: string;
  block_id: string | null;
  cycle_key: string | null;
  variety: string | null;
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
  parent_block: string;
  altura_m: number;
  dist_prc: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// SQL builders
// ─────────────────────────────────────────────────────────────────────────────

// Intento 1: statistics_cur (más eficiente)
async function queryStatsFromStatisticsCur(
  dateFrom: string,
  dateTo: string,
  blocksParam: string[] | null,
): Promise<RawStatsRow[]> {
  const sql = `
    SELECT DISTINCT ON (event_date, parent_block)
      to_char(event_date::date, 'YYYY-MM-DD') AS event_date,
      parent_block,
      block_id,
      cycle_key,
      NULL::text AS variety,
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
      q_0_1_x     AS p10,
      q_0_25_x    AS p25,
      q_0_75_x    AS p75,
      q_0_9_x     AS p90,
      sesgo_bowley_v1 AS bowley_v1,
      sesgo_bowley_v2 AS bowley_v2,
      sesgo_fisher    AS fisher,
      g               AS gini,
      hn              AS entropy_norm
    FROM slv.camp_fact_drone_statistics_cur
    WHERE event_date BETWEEN $1::date AND $2::date
      AND is_valid = true
      AND ($3::text[] IS NULL OR parent_block = ANY($3::text[]))
    ORDER BY event_date, parent_block, loaded_at DESC
  `;
  const result = await query<RawStatsRow>(sql, [dateFrom, dateTo, blocksParam]);
  return result.rows;
}

// Intento 2 (fallback): derivar stats desde ranges_cur con DISTINCT ON
// Las stats están denormalizadas — todas las filas de un bloque/fecha las repiten
async function queryStatsFromRangesCur(
  dateFrom: string,
  dateTo: string,
  blocksParam: string[] | null,
): Promise<RawStatsRow[]> {
  const sql = `
    WITH stats AS (
      SELECT DISTINCT ON (event_date, parent_block)
        to_char(event_date::date, 'YYYY-MM-DD') AS event_date,
        parent_block,
        block_id,
        cycle_key,
        NULL::text AS variety,
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
        q_0_1_x     AS p10,
        q_0_25_x    AS p25,
        q_0_75_x    AS p75,
        q_0_9_x     AS p90,
        sesgo_bowley_v1 AS bowley_v1,
        sesgo_bowley_v2 AS bowley_v2,
        sesgo_fisher    AS fisher,
        g               AS gini,
        hn              AS entropy_norm
      FROM slv.camp_fact_drone_height_ranges_cur
      WHERE event_date BETWEEN $1::date AND $2::date
        AND is_valid = true
        AND ($3::text[] IS NULL OR parent_block = ANY($3::text[]))
      ORDER BY event_date, parent_block, loaded_at DESC
    )
    SELECT * FROM stats
    ORDER BY parent_block, event_date
  `;
  const result = await query<RawStatsRow>(sql, [dateFrom, dateTo, blocksParam]);
  return result.rows;
}

// Try statistics_cur first; fall back to ranges_cur on error
async function loadStats(
  dateFrom: string,
  dateTo: string,
  blocksParam: string[] | null,
): Promise<RawStatsRow[]> {
  try {
    return await queryStatsFromStatisticsCur(dateFrom, dateTo, blocksParam);
  } catch (err) {
    console.warn("[alturas-dron] statistics_cur falló, derivando de ranges_cur:", err);
    return await queryStatsFromRangesCur(dateFrom, dateTo, blocksParam);
  }
}

function mapRawStats(raw: RawStatsRow): AlturasDronStatsRow {
  return {
    eventDate: raw.event_date,
    parentBlock: raw.parent_block,
    blockId: raw.block_id,
    cycleKey: raw.cycle_key,
    variety: raw.variety,
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
  const cacheKey = `campo-alturas-dron:v2:${filters.dateFrom}:${filters.dateTo}:${filters.block}:${filters.variety}:${filters.q}`;

  return cachedAsync(cacheKey, TTL_MS, async () => {
    const blocksParam = toTextArrayParam(filters.block);

    // Ranges: todas las fechas del rango (para histograma con scrubber)
    const rangesSql = `
      SELECT
        to_char(event_date::date, 'YYYY-MM-DD') AS event_date,
        parent_block,
        altura_m::float8 AS altura_m,
        dist_prc::float8 AS dist_prc
      FROM slv.camp_fact_drone_height_ranges_cur
      WHERE event_date BETWEEN $1::date AND $2::date
        AND is_valid = true
        AND ($3::text[] IS NULL OR parent_block = ANY($3::text[]))
      ORDER BY parent_block, event_date, altura_m
    `;

    const [rawStats, rangesResult] = await Promise.all([
      loadStats(filters.dateFrom, filters.dateTo, blocksParam),
      query<RawRangeRow>(rangesSql, [filters.dateFrom, filters.dateTo, blocksParam]),
    ]);

    const statsRows: AlturasDronStatsRow[] = rawStats.map(mapRawStats);

    // Filtro post-SQL por variety (si viene del join lateral o columna directa)
    const varietyTokens = decodeMultiSelectValue(filters.variety);
    const varietyFilteredStats =
      varietyTokens.length > 0
        ? statsRows.filter((r) => r.variety !== null && varietyTokens.includes(r.variety))
        : statsRows;

    // Filtro post-SQL por búsqueda libre sobre parent_block
    const qTokens = filters.q
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toLocaleLowerCase("es-EC"));

    // Options derivadas ANTES del filtro q (para que el selector muestre todos los bloques del rango)
    const options = buildOptions(varietyFilteredStats);

    const filteredStats =
      qTokens.length > 0
        ? varietyFilteredStats.filter((r) =>
            qTokens.every((t) => r.parentBlock.toLocaleLowerCase("es-EC").includes(t)),
          )
        : varietyFilteredStats;

    const rangesRows: AlturasDronRangeRow[] = rangesResult.rows.map((r) => ({
      eventDate: r.event_date,
      parentBlock: r.parent_block,
      alturaM: toFloatRequired(r.altura_m),
      distPrc: toFloatRequired(r.dist_prc),
    }));

    // Filter ranges by the same blocks as the final stats (after q filter)
    const finalBlocks = new Set(filteredStats.map((r) => r.parentBlock));
    const filteredRanges = rangesRows.filter((r) => finalBlocks.has(r.parentBlock));

    const summary = computeAlturasDronSummary(filteredStats);

    return {
      generatedAt: new Date().toISOString(),
      filters,
      options,
      summary,
      stats: filteredStats,
      ranges: filteredRanges,
    };
  });
}
