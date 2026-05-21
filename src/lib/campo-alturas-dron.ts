import "server-only";

import { query } from "@/lib/db";
import { decodeMultiSelectValue } from "@/lib/multi-select";
import { cachedAsync } from "@/lib/server-cache";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos (contrato)
// ─────────────────────────────────────────────────────────────────────────────

export type AlturasDronFilters = {
  dateFrom: string; // ISO YYYY-MM-DD
  dateTo: string; // ISO YYYY-MM-DD
  block: string; // "all" | "303,304,..." encoded multi
  cycleKey: string; // "all" | "MH1-303-..." encoded multi
  q: string; // búsqueda libre sobre block
};

export type AlturasDronStatsRow = {
  eventDate: string; // YYYY-MM-DD
  parentBlock: string; // "303"
  blockId: string | null;
  cycleKey: string | null;
  alturaM: number; // e_x
  cv: number | null; // cv_x
  mediana: number | null; // me_x
  sd: number | null; // s_x
  p10: number | null; // q0_1_x
  p90: number | null; // q0_9_x
  q1: number | null; // q0_25_x
  q3: number | null; // q0_75_x
  iqr: number | null; // iqr_x
  skewFisher: number | null; // sesgo_fisher
  mad: number | null; // mad_x
  shannon: number | null; // h
  nEffective: number | null; // neff
};

export type AlturasDronRangeRow = {
  eventDate: string;
  parentBlock: string;
  alturaM: number; // altura_m (cabecera del bin)
  distPrc: number; // dist_prc (porcentaje en ese bin)
};

export type AlturasDronOptions = {
  blocks: string[]; // distinct parent_block en rango
  cycles: string[]; // distinct cycle_key en rango
};

export type AlturasDronSummary = {
  totalDates: number;
  totalBlocks: number;
  lastDate: string | null; // máxima event_date en rango
  avgHeightLastDate: number | null;
  avgCvLastDate: number | null;
  highCvBlockCount: number; // bloques con cv > 0.40 en última fecha
};

export type AlturasDronData = {
  generatedAt: string;
  filters: AlturasDronFilters;
  options: AlturasDronOptions;
  summary: AlturasDronSummary;
  stats: AlturasDronStatsRow[]; // 1 row por (date, block)
  ranges: AlturasDronRangeRow[]; // bins de altura — solo última fecha por bloque del filtro
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
  cycleKey: "all",
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
      avgHeightLastDate: null,
      avgCvLastDate: null,
      highCvBlockCount: 0,
    };
  }

  const uniqueDates = new Set(rows.map((r) => r.eventDate));
  const uniqueBlocks = new Set(rows.map((r) => r.parentBlock));

  // Última fecha en el rango filtrado
  const sortedDates = [...uniqueDates].sort();
  const lastDate = sortedDates[sortedDates.length - 1] ?? null;

  // Rows de la última fecha
  const lastRows = lastDate ? rows.filter((r) => r.eventDate === lastDate) : [];

  const avgHeightLastDate =
    lastRows.length > 0
      ? lastRows.reduce((sum, r) => sum + r.alturaM, 0) / lastRows.length
      : null;

  const cvRows = lastRows.filter((r) => r.cv !== null);
  const avgCvLastDate =
    cvRows.length > 0
      ? cvRows.reduce((sum, r) => sum + (r.cv ?? 0), 0) / cvRows.length
      : null;

  const highCvBlockCount = lastRows.filter((r) => (r.cv ?? 0) > 0.4).length;

  return {
    totalDates: uniqueDates.size,
    totalBlocks: uniqueBlocks.size,
    lastDate,
    avgHeightLastDate: avgHeightLastDate !== null ? Math.round(avgHeightLastDate * 1000) / 1000 : null,
    avgCvLastDate: avgCvLastDate !== null ? Math.round(avgCvLastDate * 10000) / 10000 : null,
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
  const cycles = [...new Set(rows.map((r) => r.cycleKey).filter((c): c is string => c !== null))].sort(
    (a, b) => a.localeCompare(b, "es-EC"),
  );
  return { blocks, cycles };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos raw DB
// ─────────────────────────────────────────────────────────────────────────────

type RawStatsRow = {
  event_date: string;
  parent_block: string;
  block_id: string | null;
  cycle_key: string | null;
  altura_m: string | number | null;
  cv: string | number | null;
  mediana: string | number | null;
  sd: string | number | null;
  p10: string | number | null;
  p90: string | number | null;
  q1: string | number | null;
  q3: string | number | null;
  iqr: string | number | null;
  skew_fisher: string | number | null;
  mad: string | number | null;
  shannon: string | number | null;
  n_effective: string | number | null;
};

type RawRangeRow = {
  event_date: string;
  parent_block: string;
  altura_m: number;
  dist_prc: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Loader principal
// ─────────────────────────────────────────────────────────────────────────────

const TTL_MS = 60 * 1000;

export async function getAlturasDronData(
  rawFilters: Partial<AlturasDronFilters> = defaultAlturasDronFilters,
): Promise<AlturasDronData> {
  const filters = normalizeAlturasDronFilters(rawFilters);
  const cacheKey = `campo-alturas-dron:v1:${filters.dateFrom}:${filters.dateTo}:${filters.block}:${filters.cycleKey}`;

  return cachedAsync(cacheKey, TTL_MS, async () => {
    const blocksParam = toTextArrayParam(filters.block);
    const cyclesParam = toTextArrayParam(filters.cycleKey);

    const statsSql = `
      WITH stats AS (
        SELECT DISTINCT ON (event_date, parent_block)
          to_char(event_date, 'YYYY-MM-DD') AS event_date,
          parent_block,
          block_id,
          cycle_key,
          e_x         AS altura_m,
          cv_x        AS cv,
          me_x        AS mediana,
          s_x         AS sd,
          q0_1_x      AS p10,
          q0_9_x      AS p90,
          q0_25_x     AS q1,
          q0_75_x     AS q3,
          iqr_x       AS iqr,
          sesgo_fisher AS skew_fisher,
          mad_x       AS mad,
          h           AS shannon,
          neff        AS n_effective
        FROM slv.camp_fact_drone_height_ranges_cur
        WHERE event_date BETWEEN $1::date AND $2::date
          AND is_valid = true
          AND ($3::text[] IS NULL OR parent_block = ANY($3::text[]))
          AND ($4::text[] IS NULL OR cycle_key = ANY($4::text[]))
        ORDER BY event_date, parent_block, loaded_at DESC
      )
      SELECT * FROM stats
      ORDER BY parent_block, event_date
    `;

    const rangesSql = `
      WITH last_dates AS (
        SELECT DISTINCT ON (parent_block)
          parent_block, event_date
        FROM slv.camp_fact_drone_height_ranges_cur
        WHERE event_date BETWEEN $1::date AND $2::date
          AND is_valid = true
          AND ($3::text[] IS NULL OR parent_block = ANY($3::text[]))
        ORDER BY parent_block, event_date DESC
      )
      SELECT
        to_char(r.event_date, 'YYYY-MM-DD') AS event_date,
        r.parent_block,
        r.altura_m::float8 AS altura_m,
        r.dist_prc::float8 AS dist_prc
      FROM slv.camp_fact_drone_height_ranges_cur r
      JOIN last_dates ld
        ON ld.parent_block = r.parent_block AND ld.event_date = r.event_date
      WHERE r.is_valid = true
      ORDER BY r.parent_block, r.altura_m
    `;

    const [statsResult, rangesResult] = await Promise.all([
      query<RawStatsRow>(statsSql, [filters.dateFrom, filters.dateTo, blocksParam, cyclesParam]),
      query<RawRangeRow>(rangesSql, [filters.dateFrom, filters.dateTo, blocksParam]),
    ]);

    const statsRows: AlturasDronStatsRow[] = statsResult.rows.map((r) => ({
      eventDate: r.event_date,
      parentBlock: r.parent_block,
      blockId: r.block_id,
      cycleKey: r.cycle_key,
      alturaM: toFloatRequired(r.altura_m),
      cv: toFloat(r.cv),
      mediana: toFloat(r.mediana),
      sd: toFloat(r.sd),
      p10: toFloat(r.p10),
      p90: toFloat(r.p90),
      q1: toFloat(r.q1),
      q3: toFloat(r.q3),
      iqr: toFloat(r.iqr),
      skewFisher: toFloat(r.skew_fisher),
      mad: toFloat(r.mad),
      shannon: toFloat(r.shannon),
      nEffective: toFloat(r.n_effective),
    }));

    // Aplicar búsqueda libre sobre parent_block (filtro post-SQL)
    const qTokens = filters.q
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((t) => t.toLocaleLowerCase("es-EC"));

    const options = buildOptions(statsRows);  // opciones del rango completo, antes de q
    const filteredStats =
      qTokens.length > 0
        ? statsRows.filter((r) => qTokens.every((t) => r.parentBlock.toLocaleLowerCase("es-EC").includes(t)))
        : statsRows;

    const rangesRows: AlturasDronRangeRow[] = rangesResult.rows.map((r) => ({
      eventDate: r.event_date,
      parentBlock: r.parent_block,
      alturaM: toFloatRequired(r.altura_m),
      distPrc: toFloatRequired(r.dist_prc),
    }));
    const summary = computeAlturasDronSummary(filteredStats);

    return {
      generatedAt: new Date().toISOString(),
      filters,
      options,
      summary,
      stats: filteredStats,
      ranges: rangesRows,
    };
  });
}
