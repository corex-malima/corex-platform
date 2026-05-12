export type CollaboratorPerformanceAccumulatorRow = {
  actualHoursHn: number;
  actualHoursRend: number;
  effectiveHoursRend: number;
  actualHoursForRend: number;
  rendMinWeightedBase: number;
  totalActualHours: number;
};

export function formatTenureLabel(days: number | null): string | null {
  if (days === null || days < 0) return null;
  if (days < 31) return `${days} d`;
  const months = Math.floor(days / 30.4375);
  if (months < 12) return `${months} mes${months === 1 ? "" : "es"}`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return remainingMonths > 0
    ? `${years} año${years === 1 ? "" : "s"}, ${remainingMonths} mes${remainingMonths === 1 ? "" : "es"}`
    : `${years} año${years === 1 ? "" : "s"}`;
}

/**
 * Buckets canon de antigüedad usados en TTHH (Demografía del personal y
 * Herramienta de Desvinculación). Importante mantener consistencia entre
 * los dos para que el filtrado funcione igual en todos los módulos.
 *
 *  - "< 30 días"
 *  - "30 - 90 días"
 *  - "91 - 180 días"
 *  - "181 - 360 días"
 *  - "> 360 días"
 *  - "Sin dato" (cuando no hay last_entry_date)
 */
export const TENURE_BUCKETS = [
  "< 30 días",
  "30 - 90 días",
  "91 - 180 días",
  "181 - 360 días",
  "> 360 días",
  "Sin dato",
] as const;

export type TenureBucket = (typeof TENURE_BUCKETS)[number];

export function tenureBucketFromDays(days: number | null): TenureBucket {
  if (days === null || !Number.isFinite(days)) return "Sin dato";
  if (days < 30) return "< 30 días";
  if (days <= 90) return "30 - 90 días";
  if (days <= 180) return "91 - 180 días";
  if (days <= 360) return "181 - 360 días";
  return "> 360 días";
}

/**
 * Calcula días transcurridos entre `lastEntryDate` (YYYY-MM-DD o Date) y
 * la fecha de referencia (default = hoy). Devuelve null si la fecha es
 * inválida o futura.
 */
export function computeTenureDays(
  lastEntryDate: string | Date | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!lastEntryDate) return null;
  const entry = lastEntryDate instanceof Date ? lastEntryDate : new Date(lastEntryDate);
  if (Number.isNaN(entry.getTime())) return null;
  const diffMs = asOf.getTime() - entry.getTime();
  if (diffMs < 0) return null;
  return Math.floor(diffMs / 86400000);
}

export function calculateCollaboratorPerformanceTotals(rows: CollaboratorPerformanceAccumulatorRow[]) {
  const actualHoursHn = rows.reduce((sum, row) => sum + row.actualHoursHn, 0);
  const actualHoursRend = rows.reduce((sum, row) => sum + row.actualHoursRend, 0);
  const effectiveHoursRend = rows.reduce((sum, row) => sum + row.effectiveHoursRend, 0);
  const actualHoursForRend = rows.reduce((sum, row) => sum + row.actualHoursForRend, 0);
  const rendMinWeightedBase = rows.reduce((sum, row) => sum + row.rendMinWeightedBase, 0);
  const totalActualHours = rows.reduce((sum, row) => sum + row.totalActualHours, 0);
  const rendimiento = actualHoursForRend > 0 ? effectiveHoursRend / actualHoursForRend : null;
  const rendimientoMin = actualHoursForRend > 0 ? rendMinWeightedBase / actualHoursForRend : null;

  return {
    actualHoursHn,
    actualHoursRend,
    effectiveHoursRend,
    actualHoursForRend,
    rendMinWeightedBase,
    totalActualHours,
    rendimiento,
    rendimientoMin,
    cumplimiento: rendimiento !== null && rendimientoMin !== null && rendimientoMin > 0
      ? rendimiento / rendimientoMin
      : null,
  };
}
