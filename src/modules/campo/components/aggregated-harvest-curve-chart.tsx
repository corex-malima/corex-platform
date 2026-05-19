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
import {
  aggregateByWeek,
  toDailyPercentSeries,
  toWeeklyPercentSeries,
  type WeeklyHarvestPoint,
  type WeeklyPercentPoint,
} from "@/modules/fenograma/lib/harvest-curve-aggregations";
import type { CurvaCosechaPoint } from "@/lib/campo-curva-cosecha";
import type { WeekKind } from "@/shared/lib/week-keys";

const MEDIAN_COLOR = "var(--color-primary)";
const MEAN_COLOR = "color-mix(in oklab, var(--color-accent) 70%, var(--color-foreground) 30%)";
const BAND_FILL = "color-mix(in oklab, var(--color-primary) 18%, transparent)";

type AggregatedHarvestCurveChartProps = {
  data: CurvaCosechaPoint[];
  view: HarvestCurveView;
  weekKind: WeekKind;
  weeklyMetric: HarvestCurveWeeklyMetric;
};

type EnrichedPoint = CurvaCosechaPoint & {
  // Para banda media±σ en daily y cumulative
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

type TooltipPayload =
  | ReadonlyArray<{ name?: string; value?: number | string; payload?: Record<string, unknown> }>
  | undefined;

export const AggregatedHarvestCurveChart = memo(function AggregatedHarvestCurveChart({
  data,
  view,
  weekKind,
  weeklyMetric,
}: AggregatedHarvestCurveChartProps) {
  const enriched = useMemo(() => data.map(enrichPoint), [data]);

  const weeklyData = useMemo<WeeklyHarvestPoint[]>(() => {
    if (view !== "weekly") return [];
    return aggregateByWeek(data, weekKind);
  }, [data, view, weekKind]);

  const weeklyPercent = useMemo<WeeklyPercentPoint[]>(() => {
    if (view !== "weekly" || weeklyMetric !== "percent") return [];
    const totalMedian = data.reduce((sum, p) => sum + (p.dailyStems ?? 0), 0);
    return toWeeklyPercentSeries(weeklyData, totalMedian);
  }, [view, weeklyMetric, weeklyData, data]);

  const percentData = useMemo(() => {
    if (view !== "percent") return [];
    const totalMedian = data.reduce((sum, p) => sum + (p.dailyStems ?? 0), 0);
    return toDailyPercentSeries(data, totalMedian);
  }, [view, data]);

  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%" minHeight={420}>
        {view === "cumulative" ? (
          <CumulativeView data={enriched} />
        ) : view === "daily" ? (
          <DailyAbsoluteView data={enriched} />
        ) : view === "percent" ? (
          <DailyPercentView data={percentData} />
        ) : view === "weight-per-stem" ? (
          <DailyWeightPerStemView data={enriched} />
        ) : (
          <WeeklyView data={weeklyData} percentData={weeklyPercent} metric={weeklyMetric} weekKind={weekKind} />
        )}
      </ResponsiveContainer>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Vista 1: Acumulado — mediana + banda media±σ
// ─────────────────────────────────────────────────────────────────────────────

function CumulativeView({ data }: { data: EnrichedPoint[] }) {
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
                  value: point.stats.cumulativeStemsMean !== null
                    ? formatFlexibleNumber(point.stats.cumulativeStemsMean)
                    : "-",
                },
                {
                  label: "σ acumulada",
                  value: point.stats.cumulativeStemsSd !== null
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
// Vista 2: Diario — mediana + banda media±σ
// ─────────────────────────────────────────────────────────────────────────────

function DailyAbsoluteView({ data }: { data: EnrichedPoint[] }) {
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
                  label: "Mediana tallos/día",
                  value: formatFlexibleNumber(point.stats.dailyStemsMedian ?? 0),
                },
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
// Vista 3: % del total por día
// ─────────────────────────────────────────────────────────────────────────────

type PercentPoint = {
  eventDay: number;
  eventDate: string;
  dailyStems: number;
  percent: number;
  isProjected: boolean;
};

function DailyPercentView({ data }: { data: PercentPoint[] }) {
  return (
    <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) =>
          formatPercent(Number(value), { maximumFractionDigits: 1, minimumFractionDigits: 0 })
        }
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label) => `Día ${label}`}
            mapPayload={(payload: TooltipPayload) => {
              const point = payload?.[0]?.payload as PercentPoint | undefined;
              if (!point) return [];
              return [
                { label: "% del total (mediana)", value: formatPercent(point.percent, { maximumFractionDigits: 2 }) },
                { label: "Mediana tallos/día", value: formatFlexibleNumber(point.dailyStems) },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="percent" name="% del total" isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((point) => (
          <Cell key={point.eventDay} fill={MEDIAN_COLOR} />
        ))}
      </Bar>
    </BarChart>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista 4: Peso/tallo por día (mediana)
// ─────────────────────────────────────────────────────────────────────────────

function DailyWeightPerStemView({ data }: { data: EnrichedPoint[] }) {
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
                {
                  label: "σ peso/tallo",
                  value:
                    point.stats.dailyWeightPerStemGSd !== null
                      ? `${formatFlexibleNumber(point.stats.dailyWeightPerStemGSd)} g`
                      : "-",
                },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar
        dataKey="dailyWeightPerStemG"
        name="Mediana peso/tallo (g)"
        isAnimationActive={false}
        radius={[3, 3, 0, 0]}
      >
        {data.map((point) => (
          <Cell key={point.eventDay} fill={MEDIAN_COLOR} />
        ))}
      </Bar>
    </BarChart>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vista 5: Semanal (deshabilitada en V1 vía disabledViews del control)
// Quedó implementada por compatibilidad si en el futuro se reinterpreta
// como "cada 7 días relativos".
// ─────────────────────────────────────────────────────────────────────────────

type WeeklyViewProps = {
  data: WeeklyHarvestPoint[];
  percentData: WeeklyPercentPoint[];
  metric: HarvestCurveWeeklyMetric;
  weekKind: WeekKind;
};

function WeeklyView({ data, percentData, metric }: WeeklyViewProps) {
  if (metric === "percent") {
    return (
      <BarChart data={percentData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid {...gridConfig} />
        <XAxis {...axisConfig} dataKey="weekKey" tick={axisTickStyle} />
        <YAxis
          {...axisConfig}
          tick={axisTickStyle}
          tickFormatter={(value) =>
            formatPercent(Number(value), { maximumFractionDigits: 1, minimumFractionDigits: 0 })
          }
        />
        <Tooltip
          content={
            <RechartsTooltipAdapter
              title={(label) => `Semana ${label}`}
              mapPayload={(payload: TooltipPayload) => {
                const point = payload?.[0]?.payload as WeeklyPercentPoint | undefined;
                if (!point) return [];
                return [
                  { label: "% del total", value: formatPercent(point.percent, { maximumFractionDigits: 2 }) },
                ];
              }}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="percent" name="% del total" isAnimationActive={false} radius={[3, 3, 0, 0]}>
          {percentData.map((point) => (
            <Cell key={point.weekKey} fill={MEDIAN_COLOR} />
          ))}
        </Bar>
      </BarChart>
    );
  }

  const dataKey = metric === "cumulative" ? "cumulativeStems" : "dailyStems";
  const label = metric === "cumulative" ? "Acumulado semana" : "Tallos semana";

  return (
    <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="weekKey" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) => formatFlexibleNumber(Number(value))}
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label) => `Semana ${label}`}
            mapPayload={(payload: TooltipPayload) => {
              const point = payload?.[0]?.payload as WeeklyHarvestPoint | undefined;
              if (!point) return [];
              return [
                { label: "Tallos semana", value: formatFlexibleNumber(point.dailyStems) },
                { label: "Acumulado", value: formatFlexibleNumber(point.cumulativeStems) },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey={dataKey} name={label} isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((point) => (
          <Cell key={point.weekKey} fill={MEDIAN_COLOR} />
        ))}
      </Bar>
    </BarChart>
  );
}
