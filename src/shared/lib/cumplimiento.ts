/**
 * Helpers de color semáforo para KPIs con meta + cumplimiento.
 *
 * Convención canon del repo (ver `productividad-explorer.tsx:321` para el
 * patrón original que se reusa):
 *
 *   cumplimiento (ratio) = valor_real / valor_meta
 *
 *   - ratio >= 1.0  → "success"  (sobre meta, verde)
 *   - 0.8 <= r < 1  → "warning"  (cerca de meta, ámbar)
 *   - ratio < 0.8   → "danger"   (debajo de meta, rojo)
 *   - null          → "default"  (sin datos)
 *
 * Para métricas donde "menor es mejor" (Desperdicio en Balanzas), la
 * función `cumplimientoAccentInverso` aplica el mismo criterio porque el
 * loader de KPI Desperdicio ya devuelve `cumplimiento = |meta| / |real|`
 * (es decir, >1 = mejor que la meta).
 *
 * Para el ajuste de Balanzas, `ajusteAccent` da una semántica distinta:
 *   - tocó borde de censura [0.98, 1.02] → "warning"
 *   - dentro del rango operativo intermedio → "success"
 */

export type CumplimientoAccent = "success" | "warning" | "danger" | "default";
export type AjusteAccent = "success" | "warning" | "default";

/**
 * Accent semáforo estándar para cumplimiento (mayor-es-mejor).
 * - `null` → "default"
 * - ≥ 1.0  → "success"
 * - ≥ 0.8  → "warning"
 * - < 0.8  → "danger"
 */
export function cumplimientoAccent(ratio: number | null): CumplimientoAccent {
  if (ratio === null || !Number.isFinite(ratio)) return "default";
  if (ratio >= 1.0) return "success";
  if (ratio >= 0.8) return "warning";
  return "danger";
}

/**
 * Accent semáforo para cumplimiento de métricas "menor es mejor"
 * (Desperdicio en Balanzas).
 *
 * Convención del loader: `cumplimiento_desperdicio = |meta| / |real|`,
 * por lo que >1 significa que el real fue MENOR que la meta (bueno).
 * Reutilizamos `cumplimientoAccent` directamente — los umbrales aplican
 * idénticos.
 */
export const cumplimientoAccentInverso = cumplimientoAccent;

/**
 * Accent específico para el KPI Ajuste de Balanzas.
 *
 * Convención R3+: `ajuste_final` está limitado solo por abajo a 0.96
 * (sin techo). Si el valor tocó el piso (0.96), significa que el modelo
 * predictivo se desvía demasiado del peso real de ventas — estado de
 * atención (`warning`). Si está por encima del piso, el modelo es
 * confiable (`success`).
 */
export function ajusteAccent(value: number | null): AjusteAccent {
  if (value === null || !Number.isFinite(value)) return "default";
  const TOLERANCE = 1e-6;
  if (value <= 0.96 + TOLERANCE) return "warning";
  return "success";
}
