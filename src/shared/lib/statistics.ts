/**
 * Helpers estadísticos descriptivos reusables a través de módulos analíticos.
 *
 * Todos los helpers filtran valores no-finitos (`NaN`, `null`, `undefined`,
 * `Infinity`) silenciosamente y devuelven `null` cuando no hay datos
 * suficientes — esto distingue "ausencia de datos" de "valor cero".
 *
 * Convenciones:
 * - `mean`     — media aritmética. Null si n=0.
 * - `median`   — valor central (interpolación lineal entre 2 centrales si n par). Null si n=0.
 * - `sampleSd` — desviación estándar de muestra (denominador n-1). Null si n<2.
 * - `quartiles` — Q1, Q2 (mediana), Q3 por interpolación lineal (estilo `numpy.quantile method='linear'`).
 * - `describe` — versión consolidada que ordena 1 sola vez y devuelve todo.
 */

function filterFiniteNumbers(values: readonly (number | null | undefined)[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value !== "number") continue;
    if (!Number.isFinite(value)) continue;
    out.push(value);
  }
  return out;
}

function quantileSorted(sorted: readonly number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

export function mean(values: readonly (number | null | undefined)[]): number | null {
  const filtered = filterFiniteNumbers(values);
  if (filtered.length === 0) return null;
  let sum = 0;
  for (const v of filtered) sum += v;
  return sum / filtered.length;
}

export function median(values: readonly (number | null | undefined)[]): number | null {
  const filtered = filterFiniteNumbers(values);
  if (filtered.length === 0) return null;
  const sorted = [...filtered].sort((a, b) => a - b);
  return quantileSorted(sorted, 0.5);
}

export function sampleSd(values: readonly (number | null | undefined)[]): number | null {
  const filtered = filterFiniteNumbers(values);
  if (filtered.length < 2) return null;
  const m = mean(filtered)!;
  let sumSq = 0;
  for (const v of filtered) {
    const d = v - m;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (filtered.length - 1));
}

export type Quartiles = {
  q1: number | null;
  q2: number | null;
  q3: number | null;
};

export function quartiles(values: readonly (number | null | undefined)[]): Quartiles {
  const filtered = filterFiniteNumbers(values);
  if (filtered.length === 0) return { q1: null, q2: null, q3: null };
  const sorted = [...filtered].sort((a, b) => a - b);
  return {
    q1: quantileSorted(sorted, 0.25),
    q2: quantileSorted(sorted, 0.5),
    q3: quantileSorted(sorted, 0.75),
  };
}

export function minMax(values: readonly (number | null | undefined)[]): { min: number | null; max: number | null } {
  const filtered = filterFiniteNumbers(values);
  if (filtered.length === 0) return { min: null, max: null };
  let lo = filtered[0]!;
  let hi = filtered[0]!;
  for (let i = 1; i < filtered.length; i += 1) {
    const v = filtered[i]!;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { min: lo, max: hi };
}

export type DescriptiveStats = {
  n: number;
  mean: number | null;
  median: number | null;
  sd: number | null;
  q1: number | null;
  q3: number | null;
  p10: number | null;
  p90: number | null;
  min: number | null;
  max: number | null;
};

/**
 * Calcula todos los estadísticos en una sola pasada (ordena una sola vez).
 * Más eficiente que llamar cada helper por separado cuando se necesitan varios.
 */
export function describe(values: readonly (number | null | undefined)[]): DescriptiveStats {
  const filtered = filterFiniteNumbers(values);
  const n = filtered.length;
  if (n === 0) {
    return { n: 0, mean: null, median: null, sd: null, q1: null, q3: null, p10: null, p90: null, min: null, max: null };
  }

  const sorted = [...filtered].sort((a, b) => a - b);

  let sum = 0;
  for (const v of sorted) sum += v;
  const m = sum / n;

  let sd: number | null = null;
  if (n >= 2) {
    let sumSq = 0;
    for (const v of sorted) {
      const d = v - m;
      sumSq += d * d;
    }
    sd = Math.sqrt(sumSq / (n - 1));
  }

  return {
    n,
    mean: m,
    median: quantileSorted(sorted, 0.5),
    sd,
    q1: quantileSorted(sorted, 0.25),
    q3: quantileSorted(sorted, 0.75),
    p10: quantileSorted(sorted, 0.10),
    p90: quantileSorted(sorted, 0.90),
    min: sorted[0]!,
    max: sorted[n - 1]!,
  };
}

export type LinearRegression = {
  slope: number; // pendiente (unidad/tiempo)
  intercept: number; // ordenada al origen
  r2: number; // coeficiente de determinación [0..1]
  n: number; // número de puntos válidos
};

/**
 * Regresión lineal por mínimos cuadrados.
 *
 * - Filtra pares (x,y) donde cualquiera no sea finito.
 * - Devuelve null si n<2 (no se puede ajustar línea).
 * - r2 = 1 cuando ssTot === 0 (todos los y iguales) por convención.
 */
export function linearRegression(
  xs: readonly (number | null | undefined)[],
  ys: readonly (number | null | undefined)[],
): LinearRegression | null {
  const len = Math.min(xs.length, ys.length);
  const validXs: number[] = [];
  const validYs: number[] = [];

  for (let i = 0; i < len; i += 1) {
    const x = xs[i];
    const y = ys[i];
    if (x === null || x === undefined || !Number.isFinite(x)) continue;
    if (y === null || y === undefined || !Number.isFinite(y)) continue;
    validXs.push(x);
    validYs.push(y);
  }

  const n = validXs.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  for (let i = 0; i < n; i += 1) {
    sumX += validXs[i]!;
    sumY += validYs[i]!;
    sumXX += validXs[i]! * validXs[i]!;
    sumXY += validXs[i]! * validYs[i]!;
  }

  const denominator = n * sumXX - sumX * sumX;
  const slope = denominator === 0 ? 0 : (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const meanY = sumY / n;
  let ssTot = 0;
  let ssRes = 0;

  for (let i = 0; i < n; i += 1) {
    const yPred = slope * validXs[i]! + intercept;
    const diff = validYs[i]! - meanY;
    ssTot += diff * diff;
    ssRes += (validYs[i]! - yPred) * (validYs[i]! - yPred);
  }

  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, n };
}
