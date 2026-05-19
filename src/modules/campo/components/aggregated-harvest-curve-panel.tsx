"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

import { cn } from "@/lib/utils";
import { HarvestCurveControls } from "@/modules/fenograma/components/harvest-curve-controls";
import type {
  HarvestCurveView,
  HarvestCurveWeeklyMetric,
} from "@/modules/fenograma/components/harvest-curve-chart";
import type { CurvaCosechaPoint } from "@/lib/campo-curva-cosecha";
import type { WeekKind } from "@/shared/lib/week-keys";

const AggregatedHarvestCurveChart = dynamic(
  () =>
    import("./aggregated-harvest-curve-chart").then((mod) => mod.AggregatedHarvestCurveChart),
  { ssr: false },
);

export type DisplayMetric = "weighted" | "median";

const STORAGE_KEY = "campo:curva-cosecha:view";

const VALID_VIEWS = new Set<HarvestCurveView>([
  "cumulative",
  "daily",
  "percent",
  "weight-per-stem",
  "weekly",
]);
const VALID_WEEK_KINDS = new Set<WeekKind>(["iso", "sunsat"]);
const VALID_WEEKLY_METRICS = new Set<HarvestCurveWeeklyMetric>([
  "cumulative",
  "daily",
  "percent",
  "weight-per-stem",
]);
const VALID_DISPLAY_METRICS = new Set<DisplayMetric>(["weighted", "median"]);

type PersistedState = {
  view: HarvestCurveView;
  weekKind: WeekKind;
  weeklyMetric: HarvestCurveWeeklyMetric;
  displayMetric: DisplayMetric;
};

const DEFAULT_STATE: PersistedState = {
  view: "cumulative",
  weekKind: "iso",
  weeklyMetric: "cumulative",
  displayMetric: "weighted",
};

function readPersisted(): PersistedState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      view: parsed.view && VALID_VIEWS.has(parsed.view) ? parsed.view : DEFAULT_STATE.view,
      weekKind:
        parsed.weekKind && VALID_WEEK_KINDS.has(parsed.weekKind)
          ? parsed.weekKind
          : DEFAULT_STATE.weekKind,
      weeklyMetric:
        parsed.weeklyMetric && VALID_WEEKLY_METRICS.has(parsed.weeklyMetric)
          ? parsed.weeklyMetric
          : DEFAULT_STATE.weeklyMetric,
      displayMetric:
        parsed.displayMetric && VALID_DISPLAY_METRICS.has(parsed.displayMetric)
          ? parsed.displayMetric
          : DEFAULT_STATE.displayMetric,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function writePersisted(state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage no disponible — ignorar
  }
}

const DISPLAY_METRIC_OPTIONS: Array<{ value: DisplayMetric; label: string; hint: string }> = [
  { value: "weighted", label: "Ponderado", hint: "sum/sum (suma agregada)" },
  { value: "median", label: "Mediana", hint: "Mediana + banda media±σ" },
];

export function AggregatedHarvestCurvePanel({ data }: { data: CurvaCosechaPoint[] }) {
  const [view, setView] = useState<HarvestCurveView>(() => readPersisted().view);
  const [weekKind, setWeekKind] = useState<WeekKind>(() => readPersisted().weekKind);
  const [weeklyMetric, setWeeklyMetric] = useState<HarvestCurveWeeklyMetric>(
    () => readPersisted().weeklyMetric,
  );
  const [displayMetric, setDisplayMetric] = useState<DisplayMetric>(
    () => readPersisted().displayMetric,
  );

  const handleViewChange = useCallback(
    (next: HarvestCurveView) => {
      setView(next);
      writePersisted({ view: next, weekKind, weeklyMetric, displayMetric });
    },
    [weekKind, weeklyMetric, displayMetric],
  );

  const handleWeekKindChange = useCallback(
    (next: WeekKind) => {
      setWeekKind(next);
      writePersisted({ view, weekKind: next, weeklyMetric, displayMetric });
    },
    [view, weeklyMetric, displayMetric],
  );

  const handleWeeklyMetricChange = useCallback(
    (next: HarvestCurveWeeklyMetric) => {
      setWeeklyMetric(next);
      writePersisted({ view, weekKind, weeklyMetric: next, displayMetric });
    },
    [view, weekKind, displayMetric],
  );

  const handleDisplayMetricChange = useCallback(
    (next: DisplayMetric) => {
      setDisplayMetric(next);
      writePersisted({ view, weekKind, weeklyMetric, displayMetric: next });
    },
    [view, weekKind, weeklyMetric],
  );

  return (
    <div className="flex flex-col gap-3">
      <HarvestCurveControls
        view={view}
        onViewChange={handleViewChange}
        weekKind={weekKind}
        onWeekKindChange={handleWeekKindChange}
        weeklyMetric={weeklyMetric}
        onWeeklyMetricChange={handleWeeklyMetricChange}
        weekKindDisabled
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Métrica:</span>
        <div
          role="radiogroup"
          aria-label="Métrica del chart agregado"
          className="inline-flex flex-wrap gap-1.5 rounded-full border border-border/60 bg-muted/30 p-1"
        >
          {DISPLAY_METRIC_OPTIONS.map((option) => {
            const active = option.value === displayMetric;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={active}
                title={option.hint}
                onClick={() => {
                  if (!active) handleDisplayMetricChange(option.value);
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
      </div>

      <AggregatedHarvestCurveChart
        data={data}
        view={view}
        weekKind={weekKind}
        weeklyMetric={weeklyMetric}
        displayMetric={displayMetric}
      />
    </div>
  );
}
