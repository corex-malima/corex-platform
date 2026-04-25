"use client";

import { SingleSelectField } from "@/shared/filters/single-select-field";
import { cn } from "@/lib/utils";

/**
 * Modo de métrica visible en el módulo de Balanzas.
 *
 * - `weight` (default): muestra los overlays con métricas de peso (kg).
 * - `stems`: muestra los overlays con métricas de tallos (count).
 *
 * Los nodos especiales (`-ideal`, `-ideal-grade`, `-b2-b3-weight`,
 * `-b2-b2a-weight`) son métricas de aprovechamiento/general y se muestran
 * SIEMPRE, sin importar el modo activo.
 */
export type BalanzasMetricMode = "stems" | "weight";

export const BALANZAS_METRIC_DEFAULT: BalanzasMetricMode = "weight";

const METRIC_ORDER: BalanzasMetricMode[] = ["weight", "stems"];

const BALANZAS_METRIC_LABEL: Record<BalanzasMetricMode, string> = {
  weight: "Peso",
  stems: "Tallos",
};

function isValidBalanzasMetric(value: unknown): value is BalanzasMetricMode {
  return value === "weight" || value === "stems";
}

/**
 * Selector compacto para alternar la métrica visible (Tallos vs Peso) del
 * módulo Balanzas. Diseñado para vivir en `actions` de `SectionPageShell`.
 *
 * `Restablecer` (reset filtros) NO debe modificar este state — el modo
 * de métrica es independiente de los filtros temporales.
 */
export function BalanzasMetricSelector({
  value,
  onChange,
  className,
}: {
  value: BalanzasMetricMode;
  onChange: (mode: BalanzasMetricMode) => void;
  className?: string;
}) {
  return (
    <SingleSelectField
      id="balanzas-metric"
      label="Métrica de Balanzas"
      hideLabel
      omitEmpty
      value={value}
      options={[...METRIC_ORDER]}
      displayValue={(option) =>
        isValidBalanzasMetric(option) ? BALANZAS_METRIC_LABEL[option] : option
      }
      onChange={(next) => {
        if (isValidBalanzasMetric(next)) {
          onChange(next);
        }
      }}
      className={cn("min-w-[160px]", className)}
    />
  );
}
