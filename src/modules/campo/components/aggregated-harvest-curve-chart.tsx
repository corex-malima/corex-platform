"use client";

import { memo, useMemo } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import { axisConfig, axisTickStyle, gridConfig } from "@/shared/charts/chart-axis-config";
import { formatFlexibleNumber, formatPercent } from "@/shared/lib/format";
import type {
  HarvestCurveView,
  HarvestCurveWeeklyMetric,
} from "@/modules/fenograma/components/harvest-curve-chart";
import type { CurvaCosechaPoint } from "@/lib/campo-curva-cosecha";
import type { WeekKind } from "@/shared/lib/week-keys";
import type { DisplayMetric } from "./aggregated-harvest-curve-panel";

const MEDIAN_COLOR = "var(--color-primary)";
const MEAN_COLOR = "color-mix(in oklab, var(--color-accent) 70%, var(--color-foreground) 30%)";
const BAND_FILL = "color-mix(in oklab, var(--color-primary) 18%, transparent)";
const WEIGHTED_COLOR = "var(--color-primary)";

type AggregatedHarvestCurveChartProps = {
  data: CurvaCosechaPoint[];
  view: HarvestCurveView;
  weekKind: WeekKind;
  weeklyMetric: HarvestCurveWeeklyMetric;
  displayMetric: DisplayMetric;
};

type EnrichedPoint = CurvaCosechaPoint & {
  // Para banda media±σ en modo mediana
  dailyStemsBandLower: number | null;
  dailyStemsBandUpper: number | null;
  cumulativeStemsBandLower: number | null;
  cumulativeStemsBandUpper: number | null;
};

function enrichPoint(point: CurvaCosechaPoint): EnrichedPoint {
  const dm = point.stats.dailyStemsMean;
  const ds = point.stats.dailyStemsSd;
  const cm = point.stats.cumulativeStemsMean;
  const cs = point.stats.cumulativeStemsSd;
  return {
    ...point,
    dailyStemsBandLower: dm !== null && ds !== null ? Math.max(0, dm - ds) : null,
    dailyStemsBandUpper: dm !== null && ds !== null ? dm + ds : null,
    cumulativeStemsBandLower: cm !== null && cs !== null ? Math.max(0, cm - cs) : null,
    cumulativeStemsBandUpper: cm !== null && cs !== null ? cm + cs : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Agregador por semana relativa (cada 7 días desde el inicio de cosecha)
// ─────────────────────────────────────────────────────────────────────────────

type WeeklyRelativePoint = {
  weekKey: string;            // "S01", "S02", ...
  weekIndex: number;          // 1, 2, ...
  daysIncluded: number;       // 1-7 (la última semana puede tener menos)
  // Ponderado (sum/sum del bucket)
  weightedDailyStems: number;
  weightedCumulativeStems: number;
  weightedDailyGreenKg: number;
  weightedDailyWeightPerStemG: number | null;
  weightedPercentOfTotal: number;
  // Mediana representativa (mediana de los días de la semana)
  medianDailyStems: number;
  medianCumulativeStems: number;
  medianDailyWeightPerStemG: number | null;
};

function aggregateByRelativeWeek(
  points: CurvaCosechaPoint[],
): WeeklyRelativePoint[] {
  if (points.length === 0) return [];

  const buckets = new Map<
    number,
    {
      weekIndex: number;
      days: CurvaCosechaPoint[];
      sumWeightedDailyStems: number;
      sumWeightedDailyGreenKg: number;
      sumWeightedPercent: number;
      lastWeightedCumStems: number;
      lastWeightedCumGreenKg: number;
      lastMedianCumStems: number;
    }
  >();

  for (const point of points) {
    const weekIndex = Math.floor((point.eventDay - 1) / 7) + 1;
    let bucket = buckets.get(weekIndex);
    if (!bucket) {
      bucket = {
        weekIndex,
        days: [],
        sumWeightedDailyStems: 0,
        sumWeightedDailyGreenKg: 0,
        sumWeightedPercent: 0,
        lastWeightedCumStems: 0,
        lastWeightedCumGreenKg: 0,
        lastMedianCumStems: 0,
      };
      buckets.set(weekIndex, bucket);
    }
    bucket.days.push(point);
    bucket.sumWeightedDailyStems += point.weighted.dailyStems;
    bucket.sumWeightedDailyGreenKg += point.weighted.dailyGreenKg;
    bucket.sumWeightedPercent += point.weighted.percentOfTotal;
    // El último valor cumulativo de la semana = el del día más alto (eventDay mayor)
    if (point.weighted.cumulativeStems > bucket.lastWeightedCumStems) {
      bucket.lastWeightedCumStems = point.weighted.cumulativeStems;
      bucket.lastWeightedCumGreenKg = point.weighted.cumulativeGreenKg;
    }
    if (point.cumulativeStems > bucket.lastMedianCumStems) {
      bucket.lastMedianCumStems = point.cumulativeStems;
    }
  }

  return [...buckets.values()]
    .sort((a, b) => a.weekIndex - b.weekIndex)
    .map((b) => {
      const weightedWeight =
        b.sumWeightedDailyStems > 0
          ? Math.round((b.sumWeightedDailyGreenKg / b.sumWeightedDailyStems) * 1000 * 10) / 10
          : null;
      // Mediana del día representativo (último del bucket — pico de la semana)
      const lastDay = b.days[b.days.length - 1]!;
      return {
        weekKey: `S${String(b.weekIndex).padStart(2, "0")}`,
        weekIndex: b.weekIndex,
        daysIncluded: b.days.length,
        weightedDailyStems: Math.round(b.sumWeightedDailyStems),
        weightedCumulativeStems: Math.round(b.lastWeightedCumStems),
        weightedDailyGreenKg: Math.round(b.sumWeightedDailyGreenKg * 100) / 100,
        weightedDailyWeightPerStemG: weightedWeight,
        weightedPercentOfTotal: Math.round(b.sumWeightedPercent * 10) / 10,
        medianDailyStems: lastDay.dailyStems,
        medianCumulativeStems: lastDay.cumulativeStems,
        medianDailyWeightPerStemG: lastDay.dailyWeightPerStemG,
      };
    });
}

// ─────────────────────────────────────────────────────────────────────────────

export const AggregatedHarvestCurveChart = memo(function AggregatedHarvestCurveChart({
  data,
  view,
  weeklyMetric,
  displayMetric,
}: AggregatedHarvestCurveChartProps) {
  const enriched = useMemo(() => data.map(enrichPoint), [data]);
  const weeklyRelative = useMemo<WeeklyRelativePoint[]>(
    () => (view === "weekly" ? aggregateByRelativeWeek(data) : []),
    [view, data],
  );

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={420}>
        {view === "cumulative" ? (
          <CumulativeView data={enriched} displayMetric={displayMetric} />
        ) : view === "daily" ? (
          <DailyAbsoluteView data={enriched} displayMetric={displayMetric} />
        ) : view === "percent" ? (
          <DailyPercentView data={enriched} displayMetric={displayMetric} />
        ) : view === "weight-per-stem" ? (
          <DailyWeightPerStemView data={enriched} displayMetric={displayMetric} />
        ) : (
          <WeeklyView data={weeklyRelative} metric={weeklyMetric} displayMetric={displayMetric} />
        )}
      </ResponsiveContainer>
    </div>
  );
});

type TooltipPayload =
  | ReadonlyArray<{ name?: string; value?: number | string; payload?: Record<string, unknown> }>
  | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Vista 1: Acumulado
// ─────────────────────────────────────────────────────────────────────────────

function CumulativeView({
  data,
  displayMetric,
}: {
  data: EnrichedPoint[];
  displayMetric: DisplayMetric;
}) {
  if (displayMetric === "weighted") {
    return (
      <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid {...gridConfig} />
        <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
        <YAxis
          {...axisConfig}
          tick={axisTickStyle}
          tickFormatter={(value) => formatFlexibleNumber(Number(value))}
        />
        <Tooltip
          content={
            <RechartsTooltipAdapter
              title={(label) => `Día ${label}`}
              mapPayload={(payload: TooltipPayload) => {
                const point = payload?.[0]?.payload as EnrichedPoint | undefined;
                if (!point) return [];
                return [
                  { label: "n ciclos", value: formatFlexibleNumber(point.stats.n) },
                  { label: "Acumulado (sum)", value: formatFlexibleNumber(point.weighted.cumulativeStems) },
                  { label: "Tallos día (sum)", value: formatFlexibleNumber(point.weighted.dailyStems) },
                ];
              }}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          dataKey="weighted.cumulativeStems"
          name="Acumulado ponderado"
          stroke={WEIGHTED_COLOR}
          strokeWidth={3}
          strokeLinecap="round"
          dot={false}
          activeDot={{ fill: WEIGHTED_COLOR, r: 4, strokeWidth: 0 }}
          type="monotone"
        />
      </ComposedChart>
    );
  }

  // Mediana + banda media±σ
  return (
    <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) => formatFlexibleNumber(Number(value))}
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label) => `Día ${label}`}
            mapPayload={(payload: TooltipPayload) => {
              const point = payload?.[0]?.payload as EnrichedPoint | undefined;
              if (!point) return [];
              return [
                { label: "n ciclos", value: formatFlexibleNumber(point.stats.n) },
                {
                  label: "Mediana acumulada",
                  value: formatFlexibleNumber(point.stats.cumulativeStemsMedian ?? 0),
                },
                {
                  label: "Media acumulada",
                  value:
                    point.stats.cumulativeStemsMean !== null
                      ? formatFlexibleNumber(point.stats.cumulativeStemsMean)
                      : "-",
                },
                {
                  label: "σ acumulada",
                  value:
                    point.stats.cumulativeStemsSd !== null
                      ? formatFlexibleNumber(point.stats.cumulativeStemsSd)
                      : "-",
                },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Area
        type="monotone"
        dataKey="cumulativeStemsBandUpper"
        stroke="transparent"
        fill={BAND_FILL}
        legendType="none"
        isAnimationActive={false}
      />
      <Area
        type="monotone"
        dataKey="cumulativeStemsBandLower"
        stroke="transparent"
        fill="var(--color-background)"
        legendType="none"
        isAnimationActive={false}
      />
      <Line
        dataKey="cumulativeStems"
        name="Mediana acumulado"
        stroke={MEDIAN_COLOR}
        strokeWidth={3}
        strokeLinecap="round"
        dot={false}
        activeDot={{ fill: MEDIAN_COLOR, r: 4, strokeWidth: 0 }}
        type="monotone"
      />
      <Line
        dataKey="stats.cumulativeStemsMean"
        name="Media acumulado"
        stroke={MEAN_COLOR}
        strokeWidth={2}
        strokeDasharray="6 4"
        dot={false}
        type="monotone"
      />
    </ComposedChart>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista 2: Diario absoluto
// ─────────────────────────────────────────────────────────────────────────────

function DailyAbsoluteView({
  data,
  displayMetric,
}: {
  data: EnrichedPoint[];
  displayMetric: DisplayMetric;
}) {
  if (displayMetric === "weighted") {
    return (
      <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid {...gridConfig} />
        <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
        <YAxis
          {...axisConfig}
          tick={axisTickStyle}
          tickFormatter={(value) => formatFlexibleNumber(Number(value))}
        />
        <Tooltip
          content={
            <RechartsTooltipAdapter
              title={(label) => `Día ${label}`}
              mapPayload={(payload: TooltipPayload) => {
                const point = payload?.[0]?.payload as EnrichedPoint | undefined;
                if (!point) return [];
                return [
                  { label: "n ciclos", value: formatFlexibleNumber(point.stats.n) },
                  { label: "Tallos día (sum)", value: formatFlexibleNumber(point.weighted.dailyStems) },
                  { label: "Kg verde día (sum)", value: formatFlexibleNumber(point.weighted.dailyGreenKg) },
                ];
              }}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="weighted.dailyStems"
          name="Tallos día (sum)"
          isAnimationActive={false}
          radius={[3, 3, 0, 0]}
        >
          {data.map((point) => (
            <Cell key={point.eventDay} fill={WEIGHTED_COLOR} />
          ))}
        </Bar>
      </BarChart>
    );
  }

  // Mediana + banda
  return (
    <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) => formatFlexibleNumber(Number(value))}
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label) => `Día ${label}`}
            mapPayload={(payload: TooltipPayload) => {
              const point = payload?.[0]?.payload as EnrichedPoint | undefined;
              if (!point) return [];
              return [
                { label: "n ciclos", value: formatFlexibleNumber(point.stats.n) },
                { label: "Mediana tallos/día", value: formatFlexibleNumber(point.stats.dailyStemsMedian ?? 0) },
                {
                  label: "Media tallos/día",
                  value:
                    point.stats.dailyStemsMean !== null
                      ? formatFlexibleNumber(point.stats.dailyStemsMean)
                      : "-",
                },
                {
                  label: "σ tallos/día",
                  value:
                    point.stats.dailyStemsSd !== null
                      ? formatFlexibleNumber(point.stats.dailyStemsSd)
                      : "-",
                },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Area
        type="monotone"
        dataKey="dailyStemsBandUpper"
        stroke="transparent"
        fill={BAND_FILL}
        legendType="none"
        isAnimationActive={false}
      />
      <Area
        type="monotone"
        dataKey="dailyStemsBandLower"
        stroke="transparent"
        fill="var(--color-background)"
        legendType="none"
        isAnimationActive={false}
      />
      <Line
        dataKey="dailyStems"
        name="Mediana tallos/día"
        stroke={MEDIAN_COLOR}
        strokeWidth={3}
        strokeLinecap="round"
        dot={false}
        type="monotone"
      />
      <Line
        dataKey="stats.dailyStemsMean"
        name="Media tallos/día"
        stroke={MEAN_COLOR}
        strokeWidth={2}
        strokeDasharray="6 4"
        dot={false}
        type="monotone"
      />
    </ComposedChart>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista 3: % del total
// ─────────────────────────────────────────────────────────────────────────────

function DailyPercentView({
  data,
  displayMetric,
}: {
  data: EnrichedPoint[];
  displayMetric: DisplayMetric;
}) {
  // En % siempre usamos ponderado (sum/sum). En modo mediana mostramos % de mediana.
  const isWeighted = displayMetric === "weighted";
  const dataKey = isWeighted ? "weighted.percentOfTotal" : "stats.dailyStemsMedian";
  const formatter = isWeighted
    ? (value: number) =>
        formatPercent(value, { maximumFractionDigits: 1, minimumFractionDigits: 0 })
    : (value: number) => formatFlexibleNumber(value);

  return (
    <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) => formatter(Number(value))}
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label) => `Día ${label}`}
            mapPayload={(payload: TooltipPayload) => {
              const point = payload?.[0]?.payload as EnrichedPoint | undefined;
              if (!point) return [];
              if (isWeighted) {
                return [
                  { label: "% del total (ponderado)", value: formatPercent(point.weighted.percentOfTotal, { maximumFractionDigits: 2 }) },
                  { label: "Tallos día (sum)", value: formatFlexibleNumber(point.weighted.dailyStems) },
                ];
              }
              return [
                { label: "n ciclos", value: formatFlexibleNumber(point.stats.n) },
                { label: "Mediana tallos/día", value: formatFlexibleNumber(point.stats.dailyStemsMedian ?? 0) },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar
        dataKey={dataKey}
        name={isWeighted ? "% del total" : "Mediana tallos/día"}
        isAnimationActive={false}
        radius={[3, 3, 0, 0]}
      >
        {data.map((point) => (
          <Cell
            key={point.eventDay}
            fill={isWeighted ? WEIGHTED_COLOR : MEDIAN_COLOR}
          />
        ))}
      </Bar>
    </BarChart>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista 4: Peso/tallo
// ─────────────────────────────────────────────────────────────────────────────

function DailyWeightPerStemView({
  data,
  displayMetric,
}: {
  data: EnrichedPoint[];
  displayMetric: DisplayMetric;
}) {
  const isWeighted = displayMetric === "weighted";
  const dataKey = isWeighted ? "weighted.dailyWeightPerStemG" : "dailyWeightPerStemG";

  return (
    <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) => `${formatFlexibleNumber(Number(value))} g`}
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label) => `Día ${label}`}
            mapPayload={(payload: TooltipPayload) => {
              const point = payload?.[0]?.payload as EnrichedPoint | undefined;
              if (!point) return [];
              if (isWeighted) {
                return [
                  { label: "n ciclos", value: formatFlexibleNumber(point.stats.n) },
                  {
                    label: "Peso/tallo (ponderado)",
                    value:
                      point.weighted.dailyWeightPerStemG !== null
                        ? `${formatFlexibleNumber(point.weighted.dailyWeightPerStemG)} g`
                        : "-",
                  },
                  { label: "Tallos día (sum)", value: formatFlexibleNumber(point.weighted.dailyStems) },
                  { label: "Kg verde día (sum)", value: formatFlexibleNumber(point.weighted.dailyGreenKg) },
                ];
              }
              return [
                { label: "n ciclos", value: formatFlexibleNumber(point.stats.n) },
                {
                  label: "Mediana peso/tallo",
                  value:
                    point.dailyWeightPerStemG !== null
                      ? `${formatFlexibleNumber(point.dailyWeightPerStemG)} g`
                      : "-",
                },
                {
                  label: "Media peso/tallo",
                  value:
                    point.stats.dailyWeightPerStemGMean !== null
                      ? `${formatFlexibleNumber(point.stats.dailyWeightPerStemGMean)} g`
                      : "-",
                },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar
        dataKey={dataKey}
        name={isWeighted ? "Peso/tallo ponderado (g)" : "Mediana peso/tallo (g)"}
        isAnimationActive={false}
        radius={[3, 3, 0, 0]}
      >
        {data.map((point) => (
          <Cell key={point.eventDay} fill={isWeighted ? WEIGHTED_COLOR : MEDIAN_COLOR} />
        ))}
      </Bar>
    </BarChart>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista 5: Semanal (semana relativa — cada 7 días desde inicio de cosecha)
// ─────────────────────────────────────────────────────────────────────────────

function WeeklyView({
  data,
  metric,
  displayMetric,
}: {
  data: WeeklyRelativePoint[];
  metric: HarvestCurveWeeklyMetric;
  displayMetric: DisplayMetric;
}) {
  const isWeighted = displayMetric === "weighted";

  // Resolver dataKey y nombre según métrica y modo
  let dataKey: string;
  let label: string;
  let yFormatter: (value: number) => string;

  switch (metric) {
    case "cumulative":
      dataKey = isWeighted ? "weightedCumulativeStems" : "medianCumulativeStems";
      label = isWeighted ? "Acumulado semana (sum)" : "Mediana acumulado";
      yFormatter = (v) => formatFlexibleNumber(v);
      break;
    case "daily":
      dataKey = isWeighted ? "weightedDailyStems" : "medianDailyStems";
      label = isWeighted ? "Tallos semana (sum)" : "Mediana tallos semana";
      yFormatter = (v) => formatFlexibleNumber(v);
      break;
    case "percent":
      dataKey = "weightedPercentOfTotal";
      label = "% del total semana";
      yFormatter = (v) => formatPercent(v, { maximumFractionDigits: 1, minimumFractionDigits: 0 });
      break;
    case "weight-per-stem":
    default:
      dataKey = isWeighted ? "weightedDailyWeightPerStemG" : "medianDailyWeightPerStemG";
      label = isWeighted ? "Peso/tallo semana (ponderado)" : "Mediana peso/tallo";
      yFormatter = (v) => `${formatFlexibleNumber(v)} g`;
      break;
  }

  return (
    <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="weekKey" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) => yFormatter(Number(value))}
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label) => `Semana ${label}`}
            mapPayload={(payload: TooltipPayload) => {
              const point = payload?.[0]?.payload as WeeklyRelativePoint | undefined;
              if (!point) return [];
              return [
                { label: "Días de la semana", value: formatFlexibleNumber(point.daysIncluded) },
                ...(metric === "cumulative"
                  ? [
                      { label: "Acumulado (sum)", value: formatFlexibleNumber(point.weightedCumulativeStems) },
                      { label: "Mediana acumulado", value: formatFlexibleNumber(point.medianCumulativeStems) },
                    ]
                  : metric === "daily"
                  ? [
                      { label: "Tallos semana (sum)", value: formatFlexibleNumber(point.weightedDailyStems) },
                      { label: "Mediana tallos día", value: formatFlexibleNumber(point.medianDailyStems) },
                    ]
                  : metric === "percent"
                  ? [{ label: "% del total", value: formatPercent(point.weightedPercentOfTotal, { maximumFractionDigits: 2 }) }]
                  : [
                      {
                        label: "Peso/tallo (ponderado)",
                        value:
                          point.weightedDailyWeightPerStemG !== null
                            ? `${formatFlexibleNumber(point.weightedDailyWeightPerStemG)} g`
                            : "-",
                      },
                      {
                        label: "Mediana peso/tallo",
                        value:
                          point.medianDailyWeightPerStemG !== null
                            ? `${formatFlexibleNumber(point.medianDailyWeightPerStemG)} g`
                            : "-",
                      },
                    ]),
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey={dataKey} name={label} isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((point) => (
          <Cell key={point.weekKey} fill={isWeighted ? WEIGHTED_COLOR : MEDIAN_COLOR} />
        ))}
      </Bar>
    </BarChart>
  );
}
