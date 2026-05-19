"use client";

import { cn } from "@/lib/utils";
import type { WeekKind } from "@/shared/lib/week-keys";
import type { HarvestCurveView, HarvestCurveWeeklyMetric } from "./harvest-curve-chart";

type SegmentOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

const VIEW_OPTIONS: SegmentOption<HarvestCurveView>[] = [
  { value: "cumulative", label: "Acumulado", hint: "Curva real + proyeccion" },
  { value: "daily", label: "Diario", hint: "Tallos por dia (no acumulado)" },
  { value: "percent", label: "% del total", hint: "% diario sobre el ciclo" },
  { value: "weight-per-stem", label: "Peso/tallo", hint: "Gramos por tallo por dia" },
  { value: "weekly", label: "Semanal", hint: "Agrupado por semana" },
];

const WEEK_KIND_OPTIONS: SegmentOption<WeekKind>[] = [
  { value: "iso", label: "ISO (lun-dom)" },
  { value: "sunsat", label: "Dom-Sab" },
];

const WEEKLY_METRIC_OPTIONS: SegmentOption<HarvestCurveWeeklyMetric>[] = [
  { value: "cumulative", label: "Acumulado" },
  { value: "daily", label: "Tallos semana" },
  { value: "percent", label: "% del total" },
  { value: "weight-per-stem", label: "Peso/tallo" },
];

type SegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
};

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex flex-wrap gap-1.5 rounded-full border border-border/60 bg-muted/30 p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => {
              if (!active) onChange(option.value);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export type HarvestCurveControlsProps = {
  view: HarvestCurveView;
  onViewChange: (view: HarvestCurveView) => void;
  weekKind: WeekKind;
  onWeekKindChange: (kind: WeekKind) => void;
  weeklyMetric: HarvestCurveWeeklyMetric;
  onWeeklyMetricChange: (metric: HarvestCurveWeeklyMetric) => void;
  className?: string;
  /**
   * Vistas a ocultar del segmented control. Útil en contextos agregados
   * donde alguna vista no tiene sentido (p. ej. "weekly" en eje día-relativo).
   */
  disabledViews?: readonly HarvestCurveView[];
};

export function HarvestCurveControls({
  view,
  onViewChange,
  weekKind,
  onWeekKindChange,
  weeklyMetric,
  onWeeklyMetricChange,
  className,
  disabledViews,
}: HarvestCurveControlsProps) {
  const viewOptions =
    disabledViews && disabledViews.length > 0
      ? VIEW_OPTIONS.filter((option) => !disabledViews.includes(option.value))
      : VIEW_OPTIONS;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Vista:</span>
        <SegmentedControl<HarvestCurveView>
          options={viewOptions}
          value={view}
          onChange={onViewChange}
          ariaLabel="Vista de la curva de cosecha"
        />
      </div>

      {view === "weekly" ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Semana:</span>
            <SegmentedControl<WeekKind>
              options={WEEK_KIND_OPTIONS}
              value={weekKind}
              onChange={onWeekKindChange}
              ariaLabel="Tipo de semana"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Metrica:</span>
            <SegmentedControl<HarvestCurveWeeklyMetric>
              options={WEEKLY_METRIC_OPTIONS}
              value={weeklyMetric}
              onChange={onWeeklyMetricChange}
              ariaLabel="Metrica semanal"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
