import "server-only";

import { query } from "@/lib/db";
import { decodeMultiSelectValue } from "@/lib/multi-select";
import { cachedAsync } from "@/lib/server-cache";
import { describe } from "@/shared/lib/statistics";
import { roundValue, toNumber } from "@/shared/lib/number-utils";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos (contrato)
// ─────────────────────────────────────────────────────────────────────────────

export type CurvaCosechaFilters = {
  /** Año(s) de cierre de cosecha, multi-select "all" | "2024,2025" */
  year: string;
  /** Mes(es) de cierre de cosecha, multi-select "all" | "01,02,12" */
  month: string;
  variety: string;
  spType: string;
  area: string;
};

/** Punto agregado por día relativo al inicio de cosecha. Compatible con HarvestCurvePoint. */
export type CurvaCosechaPoint = {
  // Eje X (1-indexed): día desde harvest_start_date
  eventDay: number;

  // Campos "compat HarvestCurvePoint" — usan la mediana (legacy / compat)
  eventDate: string; // siempre "" en agregado
  dailyStems: number;
  cumulativeStems: number;
  observedCumulativeStems: number | null;
  projectedCumulativeStems: number | null;
  isProjected: boolean;
  dailyGreenKg: number;
  cumulativeGreenKg: number;
  dailyWeightPerStemG: number | null;
  cumulativeWeightPerStemG: number | null;

  /**
   * Métricas ponderadas (sum/sum) — el usuario las prefiere sobre la mediana.
   * - dailyStems / cumulativeStems / dailyGreenKg / cumulativeGreenKg: suma cruda
   *   de todos los ciclos en ese día relativo.
   * - dailyWeightPerStemG: sum(green_kg)/sum(stems)*1000 ponderado por volumen.
   * - percentOfTotal: sum(stems_día) / total_global_stems * 100.
   */
  weighted: {
    dailyStems: number;
    cumulativeStems: number;
    dailyGreenKg: number;
    cumulativeGreenKg: number;
    dailyWeightPerStemG: number | null;
    cumulativeWeightPerStemG: number | null;
    percentOfTotal: number;
  };

  // Estadísticos ampliados (para tooltip + banda de dispersión en modo Mediana)
  stats: {
    n: number;
    dailyStemsMean: number | null;
    dailyStemsMedian: number | null;
    dailyStemsSd: number | null;
    cumulativeStemsMean: number | null;
    cumulativeStemsMedian: number | null;
    cumulativeStemsSd: number | null;
    dailyGreenKgMean: number | null;
    dailyGreenKgMedian: number | null;
    dailyGreenKgSd: number | null;
    dailyWeightPerStemGMean: number | null;
    dailyWeightPerStemGMedian: number | null;
    dailyWeightPerStemGSd: number | null;
  };
};

export type VegetativeSummary = {
  cyclesConsidered: number;
  mean: number | null;
  median: number | null;
  sampleSd: number | null;
  min: number | null;
  max: number | null;
  p25: number | null;
  p75: number | null;
};

export type CurvaCosechaCycleSummary = {
  cycleKey: string;
  block: string;
  area: string;
  variety: string;
  spType: string;
  spDate: string | null;
  harvestStartDate: string | null;
  harvestEndDate: string | null;
  vegetativeDays: number | null;
  totalDays: number;
  totalStems: number;
  totalGreenKg: number;
  weightPerStemG: number | null;
};

export type CurvaCosechaFilterOptions = {
  years: string[];
  months: string[];
  varieties: string[];
  spTypes: string[];
  areas: string[];
};

export type CurvaCosechaPayload = {
  generatedAt: string;
  filters: CurvaCosechaFilters;
  options: CurvaCosechaFilterOptions;
  summary: {
    cycleCount: number;
    peakDay: number | null;
    peakMedianStems: number | null;
    medianTotalStemsPerCycle: number | null;
    meanTotalStemsPerCycle: number | null;
    medianWeightPerStemG: number | null;
    meanWeightPerStemG: number | null;
    maxDayOffset: number;
    /** Suma total de tallos a través de TODOS los ciclos filtrados. Denominador del % ponderado. */
    totalStemsAllCycles: number;
    /** Suma total de kg verde a través de TODOS los ciclos filtrados. */
    totalGreenKgAllCycles: number;
    /** Peso/tallo ponderado global = sum(kg)/sum(stems)*1000. */
    weightedWeightPerStemG: number | null;
  };
  vegetative: VegetativeSummary;
  points: CurvaCosechaPoint[];
  cycles: CurvaCosechaCycleSummary[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Defaults y normalización
// ─────────────────────────────────────────────────────────────────────────────

export const defaultCurvaCosechaFilters: CurvaCosechaFilters = {
  year: "all",
  month: "all",
  variety: "all",
  spType: "all",
  area: "all",
};

function normalizeSelect(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "all";
}

export function normalizeCurvaCosechaFilters(
  input: Partial<CurvaCosechaFilters> = {},
): CurvaCosechaFilters {
  return {
    year: normalizeSelect(input.year),
    month: normalizeSelect(input.month),
    variety: normalizeSelect(input.variety),
    spType: normalizeSelect(input.spType),
    area: normalizeSelect(input.area),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregator puro (testeable sin DB)
// ─────────────────────────────────────────────────────────────────────────────

export type DayRow = {
  cycleKey: string;
  block: string | null;
  area: string | null;
  variety: string | null;
  spType: string | null;
  spDate: string | null;
  harvestStartDate: string | null;
  harvestEndDate: string | null;
  eventDate: string;
  dayOffset: number;
  dailyStems: number;
  dailyGreenKg: number;
};

type CycleAccumulator = {
  cycleKey: string;
  block: string;
  area: string;
  variety: string;
  spType: string;
  spDate: string | null;
  harvestStartDate: string | null;
  harvestEndDate: string | null;
  daysCount: number;
  totalStems: number;
  totalGreenKg: number;
};

type DayBucket = {
  // Arrays para mediana / media / σ
  dailyStems: number[];
  cumulativeStems: number[];
  dailyGreenKg: number[];
  cumulativeGreenKg: number[];
  dailyWeightG: number[];
  cumulativeWeightG: number[];
  // Sumas para ponderado (sum/sum)
  sumDailyStems: number;
  sumCumulativeStems: number;
  sumDailyGreenKg: number;
  sumCumulativeGreenKg: number;
};

function emptyBucket(): DayBucket {
  return {
    dailyStems: [],
    cumulativeStems: [],
    dailyGreenKg: [],
    cumulativeGreenKg: [],
    dailyWeightG: [],
    cumulativeWeightG: [],
    sumDailyStems: 0,
    sumCumulativeStems: 0,
    sumDailyGreenKg: 0,
    sumCumulativeGreenKg: 0,
  };
}

function daysBetween(fromIso: string, toIso: string): number | null {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return Math.round((to - from) / 86_400_000);
}

export function aggregateCycleDays(rows: DayRow[]): {
  points: CurvaCosechaPoint[];
  cycles: CurvaCosechaCycleSummary[];
  vegetative: VegetativeSummary;
  summary: CurvaCosechaPayload["summary"];
} {
  // Pasada 1: agrupar por ciclo
  const byCycle = new Map<string, { meta: CycleAccumulator; days: DayRow[] }>();
  for (const row of rows) {
    if (!Number.isFinite(row.dayOffset)) continue;
    const existing = byCycle.get(row.cycleKey);
    if (existing) {
      existing.days.push(row);
    } else {
      byCycle.set(row.cycleKey, {
        meta: {
          cycleKey: row.cycleKey,
          block: row.block ?? "",
          area: row.area ?? "",
          variety: row.variety ?? "",
          spType: row.spType ?? "",
          spDate: row.spDate,
          harvestStartDate: row.harvestStartDate,
          harvestEndDate: row.harvestEndDate,
          daysCount: 0,
          totalStems: 0,
          totalGreenKg: 0,
        },
        days: [row],
      });
    }
  }

  // Pasada 2: por ciclo, calcular series + acumular en pivot
  const pivot = new Map<number, DayBucket>();
  const cycleSummaries: CurvaCosechaCycleSummary[] = [];

  for (const { meta, days } of byCycle.values()) {
    days.sort((a, b) => a.dayOffset - b.dayOffset);

    let cumStems = 0;
    let cumGreen = 0;

    for (const day of days) {
      cumStems += day.dailyStems;
      cumGreen += day.dailyGreenKg;
      const eventDay = day.dayOffset + 1; // 1-indexed

      const dailyW = day.dailyStems > 0 ? (day.dailyGreenKg / day.dailyStems) * 1000 : null;
      const cumW = cumStems > 0 ? (cumGreen / cumStems) * 1000 : null;

      let bucket = pivot.get(eventDay);
      if (!bucket) {
        bucket = emptyBucket();
        pivot.set(eventDay, bucket);
      }
      bucket.dailyStems.push(day.dailyStems);
      bucket.cumulativeStems.push(cumStems);
      bucket.dailyGreenKg.push(day.dailyGreenKg);
      bucket.cumulativeGreenKg.push(cumGreen);
      if (dailyW !== null) bucket.dailyWeightG.push(dailyW);
      if (cumW !== null) bucket.cumulativeWeightG.push(cumW);
      // Sumas para ponderado
      bucket.sumDailyStems += day.dailyStems;
      bucket.sumCumulativeStems += cumStems;
      bucket.sumDailyGreenKg += day.dailyGreenKg;
      bucket.sumCumulativeGreenKg += cumGreen;
    }

    meta.daysCount = days.length;
    meta.totalStems = cumStems;
    meta.totalGreenKg = cumGreen;

    const vegetativeDays =
      meta.spDate && meta.harvestStartDate ? daysBetween(meta.spDate, meta.harvestStartDate) : null;

    cycleSummaries.push({
      cycleKey: meta.cycleKey,
      block: meta.block,
      area: meta.area,
      variety: meta.variety,
      spType: meta.spType,
      spDate: meta.spDate,
      harvestStartDate: meta.harvestStartDate,
      harvestEndDate: meta.harvestEndDate,
      vegetativeDays,
      totalDays: meta.daysCount,
      totalStems: roundValue(meta.totalStems),
      totalGreenKg: roundValue(meta.totalGreenKg, 2),
      weightPerStemG:
        meta.totalStems > 0 ? roundValue((meta.totalGreenKg / meta.totalStems) * 1000, 2) : null,
    });
  }

  // Total global para % ponderado (denominador)
  const totalStemsAllCycles = cycleSummaries.reduce((sum, c) => sum + c.totalStems, 0);
  const totalGreenKgAllCycles = cycleSummaries.reduce((sum, c) => sum + c.totalGreenKg, 0);
  const weightedWeightPerStemG =
    totalStemsAllCycles > 0
      ? round1((totalGreenKgAllCycles / totalStemsAllCycles) * 1000)
      : null;

  // Pasada 3: convertir buckets → CurvaCosechaPoint
  const points: CurvaCosechaPoint[] = [...pivot.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([eventDay, bucket]) => buildPoint(eventDay, bucket, totalStemsAllCycles));

  // Vegetativo (todos los ciclos con sp_date Y harvest_start_date)
  const vegetativeDaysList = cycleSummaries
    .map((c) => c.vegetativeDays)
    .filter((v): v is number => v !== null);
  const vegDescribe = describe(vegetativeDaysList);
  const vegetative: VegetativeSummary = {
    cyclesConsidered: vegDescribe.n,
    mean: round1(vegDescribe.mean),
    median: round1(vegDescribe.median),
    sampleSd: round1(vegDescribe.sd),
    min: vegDescribe.min,
    max: vegDescribe.max,
    p25: round1(vegDescribe.q1),
    p75: round1(vegDescribe.q3),
  };

  // Summary
  const totalsPerCycle = cycleSummaries.map((c) => c.totalStems);
  const weightsPerCycle = cycleSummaries
    .map((c) => c.weightPerStemG)
    .filter((v): v is number => v !== null);
  const totalsStats = describe(totalsPerCycle);
  const weightsStats = describe(weightsPerCycle);

  const peak = points.reduce<{ day: number; value: number } | null>((best, p) => {
    const v = p.stats.dailyStemsMedian;
    if (v === null) return best;
    if (best === null || v > best.value) return { day: p.eventDay, value: v };
    return best;
  }, null);

  const maxDayOffset = points.length > 0 ? points[points.length - 1]!.eventDay : 0;

  const summary: CurvaCosechaPayload["summary"] = {
    cycleCount: cycleSummaries.length,
    peakDay: peak?.day ?? null,
    peakMedianStems: peak ? round1(peak.value) : null,
    medianTotalStemsPerCycle: round1(totalsStats.median),
    meanTotalStemsPerCycle: round1(totalsStats.mean),
    medianWeightPerStemG: round1(weightsStats.median),
    meanWeightPerStemG: round1(weightsStats.mean),
    maxDayOffset,
    totalStemsAllCycles: roundValue(totalStemsAllCycles),
    totalGreenKgAllCycles: roundValue(totalGreenKgAllCycles, 2),
    weightedWeightPerStemG,
  };

  return { points, cycles: cycleSummaries, vegetative, summary };
}

function buildPoint(
  eventDay: number,
  bucket: DayBucket,
  totalStemsAllCycles: number,
): CurvaCosechaPoint {
  const stems = describe(bucket.dailyStems);
  const cum = describe(bucket.cumulativeStems);
  const green = describe(bucket.dailyGreenKg);
  const weight = describe(bucket.dailyWeightG);
  const cumGreen = describe(bucket.cumulativeGreenKg);
  const cumWeight = describe(bucket.cumulativeWeightG);

  // Ponderado (sum/sum)
  const weightedDailyWeight =
    bucket.sumDailyStems > 0
      ? round1((bucket.sumDailyGreenKg / bucket.sumDailyStems) * 1000)
      : null;
  const weightedCumWeight =
    bucket.sumCumulativeStems > 0
      ? round1((bucket.sumCumulativeGreenKg / bucket.sumCumulativeStems) * 1000)
      : null;
  const percentOfTotal =
    totalStemsAllCycles > 0 ? (bucket.sumDailyStems / totalStemsAllCycles) * 100 : 0;

  return {
    eventDay,
    eventDate: "",
    dailyStems: round0(stems.median) ?? 0,
    cumulativeStems: round0(cum.median) ?? 0,
    observedCumulativeStems: round0(cum.median),
    projectedCumulativeStems: null,
    isProjected: false,
    dailyGreenKg: round1(green.median) ?? 0,
    cumulativeGreenKg: round1(cumGreen.median) ?? 0,
    dailyWeightPerStemG: round1(weight.median),
    cumulativeWeightPerStemG: round1(cumWeight.median),
    weighted: {
      dailyStems: roundValue(bucket.sumDailyStems),
      cumulativeStems: roundValue(bucket.sumCumulativeStems),
      dailyGreenKg: roundValue(bucket.sumDailyGreenKg, 2),
      cumulativeGreenKg: roundValue(bucket.sumCumulativeGreenKg, 2),
      dailyWeightPerStemG: weightedDailyWeight,
      cumulativeWeightPerStemG: weightedCumWeight,
      percentOfTotal: round1(percentOfTotal) ?? 0,
    },
    stats: {
      n: stems.n,
      dailyStemsMean: round1(stems.mean),
      dailyStemsMedian: round1(stems.median),
      dailyStemsSd: round1(stems.sd),
      cumulativeStemsMean: round1(cum.mean),
      cumulativeStemsMedian: round1(cum.median),
      cumulativeStemsSd: round1(cum.sd),
      dailyGreenKgMean: round1(green.mean),
      dailyGreenKgMedian: round1(green.median),
      dailyGreenKgSd: round1(green.sd),
      dailyWeightPerStemGMean: round1(weight.mean),
      dailyWeightPerStemGMedian: round1(weight.median),
      dailyWeightPerStemGSd: round1(weight.sd),
    },
  };
}

function round0(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value);
}

function round1(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────────────────
// Loader (consulta DB + agregar)
// ─────────────────────────────────────────────────────────────────────────────

const TTL_MS = 60 * 1000;
const OPTIONS_TTL_MS = 5 * 60 * 1000;

type RawDayRow = {
  cycle_key: string;
  block: string | null;
  area: string | null;
  variety: string | null;
  sp_type: string | null;
  sp_date: string | null;
  harvest_start_date: string | null;
  harvest_end_date: string | null;
  event_date: string;
  day_offset: number | string;
  daily_stems: number | string;
  daily_green_kg: number | string;
};

type RawOptionsRow = {
  years: number[] | null;
  months: number[] | null;
  varieties: string[] | null;
  sp_types: string[] | null;
  areas: string[] | null;
};

function toIntArrayParam(value: string): number[] | null {
  const decoded = decodeMultiSelectValue(value);
  if (decoded.length === 0) return null;
  const ints = decoded
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => Number.isFinite(n));
  return ints.length > 0 ? ints : null;
}

function toTextArrayParam(value: string): string[] | null {
  const decoded = decodeMultiSelectValue(value);
  return decoded.length > 0 ? decoded : null;
}

async function loadFilterOptions(): Promise<CurvaCosechaFilterOptions> {
  return cachedAsync("campo-curva-cosecha:options:v1", OPTIONS_TTL_MS, async () => {
    const result = await query<RawOptionsRow>(`
      with base as (
        select distinct on (cp.cycle_key)
          cp.cycle_key,
          cp.harvest_end_date,
          nullif(trim(cp.variety), '') as variety,
          nullif(trim(cp.sp_type), '') as sp_type,
          nullif(trim(cp.area_id), '') as area
        from slv.camp_dim_cycle_profile_scd2 cp
        where cp.harvest_start_date is not null
          and cp.harvest_end_date is not null
        order by cp.cycle_key, cp.valid_from desc nulls last
      )
      select
        array(select distinct extract(year  from harvest_end_date)::int
              from base where harvest_end_date is not null order by 1 desc) as years,
        array(select distinct extract(month from harvest_end_date)::int
              from base where harvest_end_date is not null order by 1)      as months,
        array(select distinct variety from base where variety is not null order by 1) as varieties,
        array(select distinct sp_type from base where sp_type is not null order by 1) as sp_types,
        array(select distinct area    from base where area    is not null order by 1) as areas
    `);

    const row = result.rows[0];
    return {
      years: (row?.years ?? []).map((n) => String(n)),
      // Sin pad cero: formatMonthNumeric espera "1"..."12" para mapear a "Enero".."Diciembre"
      months: (row?.months ?? []).map((n) => String(n)),
      varieties: row?.varieties ?? [],
      spTypes: row?.sp_types ?? [],
      areas: row?.areas ?? [],
    };
  });
}

export async function getCurvaCosechaDashboardData(
  rawFilters: Partial<CurvaCosechaFilters> = defaultCurvaCosechaFilters,
): Promise<CurvaCosechaPayload> {
  const filters = normalizeCurvaCosechaFilters(rawFilters);
  const cacheKey = `campo-curva-cosecha:v1:${filters.year}:${filters.month}:${filters.variety}:${filters.spType}:${filters.area}`;

  return cachedAsync(cacheKey, TTL_MS, async () => {
    const yearsParam = toIntArrayParam(filters.year);
    const monthsParam = toIntArrayParam(filters.month);
    const varietiesParam = toTextArrayParam(filters.variety);
    const spTypesParam = toTextArrayParam(filters.spType);
    const areasParam = toTextArrayParam(filters.area);

    const sql = `
      with eligible_cycles as (
        select distinct on (cp.cycle_key)
          cp.cycle_key,
          cp.parent_block as block,
          nullif(trim(cp.area_id), '') as area,
          nullif(trim(cp.variety), '') as variety,
          nullif(trim(cp.sp_type), '') as sp_type,
          cp.sp_date,
          cp.harvest_start_date,
          cp.harvest_end_date
        from slv.camp_dim_cycle_profile_scd2 cp
        where cp.harvest_start_date is not null
          and cp.harvest_end_date   is not null
          and ($1::int[]  is null or extract(year  from cp.harvest_end_date)::int = any($1::int[]))
          and ($2::int[]  is null or extract(month from cp.harvest_end_date)::int = any($2::int[]))
          and ($3::text[] is null or nullif(trim(cp.variety), '') = any($3::text[]))
          and ($4::text[] is null or nullif(trim(cp.sp_type), '') = any($4::text[]))
          and ($5::text[] is null or nullif(trim(cp.area_id), '') = any($5::text[]))
        order by cp.cycle_key, cp.valid_from desc nulls last
      ),
      days_stems as (
        select fd.cycle_key, fd.event_date::date as event_date,
               coalesce(fd.stems_count, 0)::numeric as daily_stems
        from gld.mv_prod_fenograma_day_cur fd
        inner join eligible_cycles ec on ec.cycle_key = fd.cycle_key
        where fd.event_date is not null
      ),
      days_green as (
        select gd.cycle_key, gd.event_date::date as event_date,
               coalesce(gd.green_weight_kg, 0)::numeric as daily_green_kg
        from gld.mv_prod_productivity_green_day_cur gd
        inner join eligible_cycles ec on ec.cycle_key = gd.cycle_key
        where gd.event_date is not null
      ),
      days_joined as (
        select coalesce(s.cycle_key, g.cycle_key) as cycle_key,
               coalesce(s.event_date, g.event_date) as event_date,
               coalesce(s.daily_stems, 0)    as daily_stems,
               coalesce(g.daily_green_kg, 0) as daily_green_kg
        from days_stems s
        full outer join days_green g
          on g.cycle_key = s.cycle_key and g.event_date = s.event_date
      )
      select
        d.cycle_key,
        ec.block,
        ec.area,
        ec.variety,
        ec.sp_type,
        to_char(ec.sp_date,             'YYYY-MM-DD') as sp_date,
        to_char(ec.harvest_start_date,  'YYYY-MM-DD') as harvest_start_date,
        to_char(ec.harvest_end_date,    'YYYY-MM-DD') as harvest_end_date,
        to_char(d.event_date,           'YYYY-MM-DD') as event_date,
        (d.event_date - ec.harvest_start_date)::int   as day_offset,
        d.daily_stems::float8,
        d.daily_green_kg::float8
      from days_joined d
      inner join eligible_cycles ec on ec.cycle_key = d.cycle_key
      where d.event_date >= ec.harvest_start_date
        and d.event_date <= ec.harvest_end_date
      order by d.cycle_key, day_offset
    `;

    const [options, queryResult] = await Promise.all([
      loadFilterOptions(),
      query<RawDayRow>(sql, [yearsParam, monthsParam, varietiesParam, spTypesParam, areasParam]),
    ]);

    const rows: DayRow[] = queryResult.rows.map((r) => ({
      cycleKey: r.cycle_key,
      block: r.block,
      area: r.area,
      variety: r.variety,
      spType: r.sp_type,
      spDate: r.sp_date,
      harvestStartDate: r.harvest_start_date,
      harvestEndDate: r.harvest_end_date,
      eventDate: r.event_date,
      dayOffset: toNumber(r.day_offset, 0) ?? 0,
      dailyStems: toNumber(r.daily_stems, 0) ?? 0,
      dailyGreenKg: toNumber(r.daily_green_kg, 0) ?? 0,
    }));

    const aggregated = aggregateCycleDays(rows);

    return {
      generatedAt: new Date().toISOString(),
      filters,
      options,
      summary: aggregated.summary,
      vegetative: aggregated.vegetative,
      points: aggregated.points,
      cycles: aggregated.cycles,
    };
  });
}
