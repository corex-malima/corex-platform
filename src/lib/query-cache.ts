import { cachedAsync } from "./server-cache";

/**
 * Per-dashboard TTL strategies (in milliseconds).
 * These values represent how long cached data stays valid for each dashboard.
 */
const TTL = {
  fenograma: 60_000, // 1 min — frequently updated harvest data
  mortality: 120_000, // 2 min — mortality metrics
  programaciones: 300_000, // 5 min — schedule data changes less often
  comparacion: 300_000, // 5 min — comparison data is relatively static
  balanzas: 60_000, // 1 min — post-harvest scales
  campo: 300_000, // 5 min — field/area data
  metadata: 480_000, // 8 min — dimension tables, profiles
  options: 86_400_000, // 24h — dropdown options, rarely change
} as const;

type DashboardName = keyof typeof TTL;

/**
 * Cache a query result using a per-dashboard TTL strategy.
 * Delegates to the existing `cachedAsync` from server-cache.ts.
 *
 * @example
 *   const data = await dashboardCache("fenograma", `pivot:${filterKey}`, () => runQuery(filters));
 */
export function dashboardCache<T>(
  dashboard: DashboardName,
  key: string,
  loader: () => Promise<T>,
): Promise<T> {
  return cachedAsync(`${dashboard}:${key}`, TTL[dashboard], loader);
}

/**
 * Get the TTL for a specific dashboard (useful for logging/debugging).
 */
export function getDashboardTTL(dashboard: DashboardName): number {
  return TTL[dashboard];
}
