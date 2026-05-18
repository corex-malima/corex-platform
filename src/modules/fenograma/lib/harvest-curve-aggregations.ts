import type { HarvestCurvePoint } from "@/lib/fenograma";
import { getWeekKey, getWeekStartIso, getWeekEndIso, type WeekKind } from "@/shared/lib/week-keys";

export type WeeklyHarvestPoint = {
  weekKey: string;
  weekStartDate: string | null;
  weekEndDate: string | null;
  weekIndex: number;
  dailyStems: number;
  cumulativeStems: number;
  observedCumulativeStems: number | null;
  projectedCumulativeStems: number | null;
  isProjected: boolean;
  daysCount: number;
  /** Peso verde sumado en la semana (kg). */
  weeklyGreenKg: number;
  /** Peso/tallo ponderado de la semana en gramos: (Σ greenKg × 1000) / Σ stems. Null si stems ≤ 0. */
  weeklyWeightPerStemG: number | null;
};

export type PercentSeriesPoint = {
  eventDay: number;
  eventDate: string;
  dailyStems: number;
  percent: number;
  isProjected: boolean;
};

export type WeeklyPercentPoint = WeeklyHarvestPoint & { percent: number };

/**
 * Agrupa los puntos diarios en semanas según el tipo de semana indicado.
 * Mantiene orden cronológico ascendente.
 *
 * - `dailyStems` por semana = suma de tallos de los días observados/proyectados de esa semana
 * - `cumulativeStems` por semana = suma corriente del total semanal
 * - `observedCumulativeStems` / `projectedCumulativeStems` = última observación/proyección dentro de la semana (corte)
 * - `isProjected` = true si ALGÚN día de la semana es proyectado
 */
export function aggregateByWeek(
  points: HarvestCurvePoint[],
  weekKind: WeekKind,
): WeeklyHarvestPoint[] {
  if (!points.length) return [];

  const buckets = new Map<string, {
    weekKey: string;
    weekStartDate: string | null;
    weekEndDate: string | null;
    dailyStems: number;
    weeklyGreenKg: number;
    observedCumulativeStems: number | null;
    projectedCumulativeStems: number | null;
    isProjected: boolean;
    daysCount: number;
    lastEventDay: number;
  }>();

  // Mantener orden de aparición (los puntos del payload ya vienen cronológicos)
  const order: string[] = [];

  for (const point of points) {
    const key = getWeekKey(point.eventDate, weekKind);
    if (!key) continue;

    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        weekKey: key,
        weekStartDate: getWeekStartIso(point.eventDate, weekKind),
        weekEndDate: getWeekEndIso(point.eventDate, weekKind),
        dailyStems: 0,
        weeklyGreenKg: 0,
        observedCumulativeStems: null,
        projectedCumulativeStems: null,
        isProjected: false,
        daysCount: 0,
        lastEventDay: -1,
      };
      buckets.set(key, bucket);
      order.push(key);
    }

    bucket.dailyStems += point.dailyStems;
    bucket.weeklyGreenKg += point.dailyGreenKg;
    bucket.daysCount += 1;
    if (point.isProjected) bucket.isProjected = true;

    // Tomar el último corte de la semana (mayor eventDay)
    if (point.eventDay > bucket.lastEventDay) {
      bucket.lastEventDay = point.eventDay;
      bucket.observedCumulativeStems = point.observedCumulativeStems;
      bucket.projectedCumulativeStems = point.projectedCumulativeStems;
    }
  }

  let running = 0;
  return order.map((key, index) => {
    const bucket = buckets.get(key)!;
    running += bucket.dailyStems;
    const weightPerStem =
      bucket.dailyStems > 0 ? (bucket.weeklyGreenKg * 1000) / bucket.dailyStems : null;
    return {
      weekKey: bucket.weekKey,
      weekStartDate: bucket.weekStartDate,
      weekEndDate: bucket.weekEndDate,
      weekIndex: index + 1,
      dailyStems: bucket.dailyStems,
      cumulativeStems: running,
      observedCumulativeStems: bucket.observedCumulativeStems,
      projectedCumulativeStems: bucket.projectedCumulativeStems,
      isProjected: bucket.isProjected,
      daysCount: bucket.daysCount,
      weeklyGreenKg: bucket.weeklyGreenKg,
      weeklyWeightPerStemG: weightPerStem,
    };
  });
}

/**
 * Convierte los puntos diarios a una serie con `percent = (dailyStems / total) * 100`.
 * Si `total <= 0`, retorna 0 para evitar división por cero.
 */
export function toDailyPercentSeries(
  points: HarvestCurvePoint[],
  total: number,
): PercentSeriesPoint[] {
  const safeTotal = total > 0 ? total : 0;
  return points.map((point) => ({
    eventDay: point.eventDay,
    eventDate: point.eventDate,
    dailyStems: point.dailyStems,
    percent: safeTotal > 0 ? (point.dailyStems / safeTotal) * 100 : 0,
    isProjected: point.isProjected,
  }));
}

/**
 * Convierte los puntos semanales a una serie con `percent = (dailyStems / total) * 100`.
 */
export function toWeeklyPercentSeries(
  weeks: WeeklyHarvestPoint[],
  total: number,
): WeeklyPercentPoint[] {
  const safeTotal = total > 0 ? total : 0;
  return weeks.map((week) => ({
    ...week,
    percent: safeTotal > 0 ? (week.dailyStems / safeTotal) * 100 : 0,
  }));
}
