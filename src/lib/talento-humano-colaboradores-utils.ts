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
