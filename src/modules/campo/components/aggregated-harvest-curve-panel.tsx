"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";

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

const STORAGE_KEY = "campo:curva-cosecha:view";
// Vista semanal queda deshabilitada en V1 (no aplica en eje día-relativo)
const DISABLED_VIEWS: readonly HarvestCurveView[] = ["weekly"];

const VALID_VIEWS = new Set<HarvestCurveView>(["cumulative", "daily", "percent", "weight-per-stem"]);
const VALID_WEEK_KINDS = new Set<WeekKind>(["iso", "sunsat"]);
const VALID_WEEKLY_METRICS = new Set<HarvestCurveWeeklyMetric>([
  "cumulative",
  "daily",
  "percent",
  "weight-per-stem",
]);

type PersistedState = {
  view: HarvestCurveView;
  weekKind: WeekKind;
  weeklyMetric: HarvestCurveWeeklyMetric;
};

const DEFAULT_STATE: PersistedState = {
  view: "cumulative",
  weekKind: "iso",
  weeklyMetric: "cumulative",
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

export function AggregatedHarvestCurvePanel({ data }: { data: CurvaCosechaPoint[] }) {
  const [view, setView] = useState<HarvestCurveView>(() => readPersisted().view);
  const [weekKind, setWeekKind] = useState<WeekKind>(() => readPersisted().weekKind);
  const [weeklyMetric, setWeeklyMetric] = useState<HarvestCurveWeeklyMetric>(
    () => readPersisted().weeklyMetric,
  );

  const handleViewChange = useCallback(
    (next: HarvestCurveView) => {
      setView(next);
      writePersisted({ view: next, weekKind, weeklyMetric });
    },
    [weekKind, weeklyMetric],
  );

  const handleWeekKindChange = useCallback(
    (next: WeekKind) => {
      setWeekKind(next);
      writePersisted({ view, weekKind: next, weeklyMetric });
    },
    [view, weeklyMetric],
  );

  const handleWeeklyMetricChange = useCallback(
    (next: HarvestCurveWeeklyMetric) => {
      setWeeklyMetric(next);
      writePersisted({ view, weekKind, weeklyMetric: next });
    },
    [view, weekKind],
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
        disabledViews={DISABLED_VIEWS}
      />
      <AggregatedHarvestCurveChart
        data={data}
        view={view}
        weekKind={weekKind}
        weeklyMetric={weeklyMetric}
      />
    </div>
  );
}
