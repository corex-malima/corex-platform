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
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import { axisConfig, axisTickStyle, gridConfig } from "@/shared/charts/chart-axis-config";
import { formatFlexibleNumber, formatPercent } from "@/shared/lib/format";
import type { HarvestCurvePoint, HarvestCurvePayload } from "@/lib/fenograma";
import type { WeekKind } from "@/shared/lib/week-keys";
import {
  aggregateByWeek,
  toDailyPercentSeries,
  toWeeklyPercentSeries,
  type PercentSeriesPoint,
  type WeeklyHarvestPoint,
  type WeeklyPercentPoint,
} from "@/modules/fenograma/lib/harvest-curve-aggregations";

export type HarvestCurveView = "cumulative" | "daily" | "percent" | "weight-per-stem" | "weekly";
export type HarvestCurveWeeklyMetric = "cumulative" | "daily" | "percent" | "weight-per-stem";

type HarvestCurveSummary = HarvestCurvePayload["summary"];

type HarvestCurveChartProps = {
  data: HarvestCurvePoint[];
  projectionStartDay: number | null;
  summary?: HarvestCurveSummary | null;
  view?: HarvestCurveView;
  weekKind?: WeekKind;
  weeklyMetric?: HarvestCurveWeeklyMetric;
};

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

const CHART_HEIGHT = "h-[420px]";
const CHART_MIN = 420;

export const HarvestCurveChart = memo(function HarvestCurveChart({
  data,
  projectionStartDay,
  summary,
  view = "cumulative",
  weekKind = "iso",
  weeklyMetric = "cumulative",
}: HarvestCurveChartProps) {
  const totalStems = summary?.totalStems ?? 0;

  const weeklyData = useMemo<WeeklyHarvestPoint[]>(() => {
    if (view !== "weekly") return [];
    return aggregateByWeek(data, weekKind);
  }, [data, view, weekKind]);

  const weeklyPercent = useMemo<WeeklyPercentPoint[]>(() => {
    if (view !== "weekly" || weeklyMetric !== "percent") return [];
    return toWeeklyPercentSeries(weeklyData, totalStems);
  }, [view, weeklyMetric, weeklyData, totalStems]);

  const dailyPercent = useMemo<PercentSeriesPoint[]>(() => {
    if (view !== "percent") return [];
    return toDailyPercentSeries(data, totalStems);
  }, [view, data, totalStems]);

  const showWeightBar = summary && (summary.totalGreenWeightKg > 0 || summary.totalPostWeightKg > 0);

  return (
    <div className="w-full space-y-3">
      <div className={`${CHART_HEIGHT} w-full`}>
        <ResponsiveContainer width="100%" height="100%" minHeight={CHART_MIN}>
          {view === "cumulative" ? (
            <CumulativeView data={data} projectionStartDay={projectionStartDay} />
          ) : view === "daily" ? (
            <DailyAbsoluteView data={data} />
          ) : view === "percent" ? (
            <DailyPercentView data={dailyPercent} />
          ) : view === "weight-per-stem" ? (
            <DailyWeightPerStemView data={data} />
          ) : (
            <WeeklyView data={weeklyData} percentData={weeklyPercent} metric={weeklyMetric} weekKind={weekKind} />
          )}
        </ResponsiveContainer>
      </div>
      {showWeightBar ? (
        <div className="flex flex-wrap gap-2 px-1">
          <MetricBadge label="Cajas verde:" value={formatFlexibleNumber(summary.greenBoxes)} />
          <MetricBadge label="Cajas blanco:" value={formatFlexibleNumber(summary.postBoxes)} />
          {summary.weightPerStemG !== null ? (
            <MetricBadge label="Peso/tallo:" value={`${formatFlexibleNumber(summary.weightPerStemG)} g`} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Vista 1: Acumulado diario (comportamiento histórico — sin cambios visibles)
// ---------------------------------------------------------------------------

function CumulativeView({
  data,
  projectionStartDay,
}: {
  data: HarvestCurvePoint[];
  projectionStartDay: number | null;
}) {
  const projectionEndDay = data[data.length - 1]?.eventDay ?? null;

  return (
    <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <defs>
        <linearGradient id="harvestCurveFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
          <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="harvestProjectionFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.18} />
          <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0.02} />
        </linearGradient>
      </defs>
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
            title={(label, payload) => {
              const point = payload?.[0]?.payload as HarvestCurvePoint | undefined;
              return `Dia ${label}${point?.eventDate ? ` · ${point.eventDate}` : ""}`;
            }}
            mapPayload={(payload) => {
              const point = payload[0]?.payload as HarvestCurvePoint | undefined;
              if (!point) return [];

              const accumulated = point.observedCumulativeStems ?? point.projectedCumulativeStems ?? null;
              const hasWeight = point.dailyGreenKg > 0;

              return [
                { label: "Tallos acumulados", value: accumulated !== null ? formatFlexibleNumber(accumulated) : "-" },
                { label: "Tallos dia", value: formatFlexibleNumber(point.dailyStems) },
                ...(hasWeight
                  ? [
                      { label: "Kg acumulado", value: formatFlexibleNumber(point.cumulativeGreenKg) },
                      { label: "Kg dia", value: formatFlexibleNumber(point.dailyGreenKg) },
                      {
                        label: "Peso / tallo acum.",
                        value: point.cumulativeWeightPerStemG !== null ? `${formatFlexibleNumber(point.cumulativeWeightPerStemG)} g` : "-",
                      },
                      {
                        label: "Peso / tallo dia",
                        value: point.dailyWeightPerStemG !== null ? `${formatFlexibleNumber(point.dailyWeightPerStemG)} g` : "-",
                      },
                    ]
                  : []),
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      {projectionStartDay && projectionEndDay ? (
        <ReferenceArea
          fill="url(#harvestProjectionFill)"
          fillOpacity={1}
          ifOverflow="extendDomain"
          x1={projectionStartDay}
          x2={projectionEndDay}
        />
      ) : null}
      <Area
        dataKey="dailyStems"
        fill="url(#harvestCurveFill)"
        name="Corte diario"
        stroke="transparent"
        type="monotone"
        yAxisId={0}
      />
      <Line
        activeDot={{ fill: "var(--color-primary)", r: 4.5, strokeWidth: 0 }}
        dataKey="observedCumulativeStems"
        dot={false}
        name="Acumulado real"
        stroke="var(--color-primary)"
        strokeLinecap="round"
        strokeWidth={3}
        type="monotone"
        yAxisId={0}
      />
      <Line
        activeDot={{ fill: "var(--color-accent)", r: 4.5, strokeWidth: 0 }}
        dataKey="projectedCumulativeStems"
        dot={false}
        name="Acumulado proyectado"
        stroke="color-mix(in oklab, var(--color-accent) 68%, var(--color-foreground) 32%)"
        strokeDasharray="8 6"
        strokeLinecap="round"
        strokeWidth={3}
        type="monotone"
        yAxisId={0}
      />
      {projectionStartDay ? (
        <ReferenceLine
          ifOverflow="extendDomain"
          label={{
            fill: "var(--color-muted-foreground)",
            fontSize: 11,
            position: "top",
            value: "Inicio proyeccion",
          }}
          stroke="color-mix(in oklab, var(--color-foreground) 58%, var(--color-accent) 42%)"
          strokeDasharray="6 4"
          strokeWidth={2}
          x={projectionStartDay}
        />
      ) : null}
    </ComposedChart>
  );
}

// ---------------------------------------------------------------------------
// Vista 2: Tallos día absoluto (NO acumulado)
// ---------------------------------------------------------------------------

const PROJECTED_COLOR = "color-mix(in oklab, var(--color-accent) 68%, var(--color-foreground) 32%)";
const OBSERVED_COLOR = "var(--color-primary)";

function DailyAbsoluteView({ data }: { data: HarvestCurvePoint[] }) {
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
            title={(label, payload) => {
              const point = payload?.[0]?.payload as HarvestCurvePoint | undefined;
              return `Dia ${label}${point?.eventDate ? ` · ${point.eventDate}` : ""}`;
            }}
            mapPayload={(payload) => {
              const point = payload[0]?.payload as HarvestCurvePoint | undefined;
              if (!point) return [];
              return [
                { label: "Tallos dia", value: formatFlexibleNumber(point.dailyStems) },
                { label: "Tipo", value: point.isProjected ? "Proyectado" : "Real" },
                ...(point.dailyGreenKg > 0
                  ? [{ label: "Kg dia", value: formatFlexibleNumber(point.dailyGreenKg) }]
                  : []),
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="dailyStems" name="Tallos dia" isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((point) => (
          <Cell
            key={`${point.eventDay}-${point.eventDate}`}
            fill={point.isProjected ? PROJECTED_COLOR : OBSERVED_COLOR}
          />
        ))}
      </Bar>
    </BarChart>
  );
}

// ---------------------------------------------------------------------------
// Vista 3: % del total por día
// ---------------------------------------------------------------------------

function DailyPercentView({ data }: { data: PercentSeriesPoint[] }) {
  return (
    <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
      <CartesianGrid {...gridConfig} />
      <XAxis {...axisConfig} dataKey="eventDay" tick={axisTickStyle} />
      <YAxis
        {...axisConfig}
        tick={axisTickStyle}
        tickFormatter={(value) => formatPercent(Number(value), { maximumFractionDigits: 1, minimumFractionDigits: 0 })}
      />
      <Tooltip
        content={
          <RechartsTooltipAdapter
            title={(label, payload) => {
              const point = payload?.[0]?.payload as PercentSeriesPoint | undefined;
              return `Dia ${label}${point?.eventDate ? ` · ${point.eventDate}` : ""}`;
            }}
            mapPayload={(payload) => {
              const point = payload[0]?.payload as PercentSeriesPoint | undefined;
              if (!point) return [];
              return [
                { label: "% del total", value: formatPercent(point.percent, { maximumFractionDigits: 2 }) },
                { label: "Tallos dia", value: formatFlexibleNumber(point.dailyStems) },
                { label: "Tipo", value: point.isProjected ? "Proyectado" : "Real" },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="percent" name="% del total" isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((point) => (
          <Cell
            key={`${point.eventDay}-${point.eventDate}`}
            fill={point.isProjected ? PROJECTED_COLOR : OBSERVED_COLOR}
          />
        ))}
      </Bar>
    </BarChart>
  );
}

// ---------------------------------------------------------------------------
// Vista 4: Peso / tallo por día (gramos)
// ---------------------------------------------------------------------------

function DailyWeightPerStemView({ data }: { data: HarvestCurvePoint[] }) {
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
            title={(label, payload) => {
              const point = payload?.[0]?.payload as HarvestCurvePoint | undefined;
              return `Dia ${label}${point?.eventDate ? ` · ${point.eventDate}` : ""}`;
            }}
            mapPayload={(payload) => {
              const point = payload[0]?.payload as HarvestCurvePoint | undefined;
              if (!point) return [];
              return [
                {
                  label: "Peso / tallo",
                  value: point.dailyWeightPerStemG !== null ? `${formatFlexibleNumber(point.dailyWeightPerStemG)} g` : "-",
                },
                { label: "Tallos dia", value: formatFlexibleNumber(point.dailyStems) },
                { label: "Kg dia", value: formatFlexibleNumber(point.dailyGreenKg) },
                { label: "Tipo", value: point.isProjected ? "Proyectado" : "Real" },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="dailyWeightPerStemG" name="Peso / tallo (g)" isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((point) => (
          <Cell
            key={`${point.eventDay}-${point.eventDate}`}
            fill={point.isProjected ? PROJECTED_COLOR : OBSERVED_COLOR}
          />
        ))}
      </Bar>
    </BarChart>
  );
}

// ---------------------------------------------------------------------------
// Vista 5: Semanal personalizable
// ---------------------------------------------------------------------------

type WeeklyViewProps = {
  data: WeeklyHarvestPoint[];
  percentData: WeeklyPercentPoint[];
  metric: HarvestCurveWeeklyMetric;
  weekKind: WeekKind;
};

type TooltipPayload = Array<{ name?: string; value?: number | string; payload?: Record<string, unknown> }> | undefined;

function WeeklyView({ data, percentData, metric, weekKind }: WeeklyViewProps) {
  const weekKindLabel = weekKind === "iso" ? "ISO" : "Dom→Sab";

  const buildTitle = (label: string | number, payload: TooltipPayload) => {
    const point = payload?.[0]?.payload as (WeeklyHarvestPoint | WeeklyPercentPoint) | undefined;
    const range = point?.weekStartDate && point?.weekEndDate ? ` · ${point.weekStartDate} → ${point.weekEndDate}` : "";
    return `Semana ${label} (${weekKindLabel})${range}`;
  };

  if (metric === "cumulative") {
    return (
      <ComposedChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
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
              title={(label, payload) => buildTitle(label, payload)}
              mapPayload={(payload) => {
                const point = payload[0]?.payload as WeeklyHarvestPoint | undefined;
                if (!point) return [];
                return [
                  { label: "Acumulado semana", value: formatFlexibleNumber(point.cumulativeStems) },
                  { label: "Tallos semana", value: formatFlexibleNumber(point.dailyStems) },
                  { label: "Dias con corte", value: formatFlexibleNumber(point.daysCount) },
                  { label: "Tipo", value: point.isProjected ? "Proyectado" : "Real" },
                ];
              }}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          dataKey="cumulativeStems"
          name="Acumulado semana"
          stroke={OBSERVED_COLOR}
          strokeWidth={3}
          strokeLinecap="round"
          dot={{ fill: OBSERVED_COLOR, r: 3.5, strokeWidth: 0 }}
          activeDot={{ fill: OBSERVED_COLOR, r: 5, strokeWidth: 0 }}
          type="monotone"
        />
      </ComposedChart>
    );
  }

  if (metric === "percent") {
    return (
      <BarChart data={percentData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid {...gridConfig} />
        <XAxis {...axisConfig} dataKey="weekKey" tick={axisTickStyle} />
        <YAxis
          {...axisConfig}
          tick={axisTickStyle}
          tickFormatter={(value) => formatPercent(Number(value), { maximumFractionDigits: 1, minimumFractionDigits: 0 })}
        />
        <Tooltip
          content={
            <RechartsTooltipAdapter
              title={(label, payload) => buildTitle(label, payload)}
              mapPayload={(payload) => {
                const point = payload[0]?.payload as WeeklyPercentPoint | undefined;
                if (!point) return [];
                return [
                  { label: "% del total", value: formatPercent(point.percent, { maximumFractionDigits: 2 }) },
                  { label: "Tallos semana", value: formatFlexibleNumber(point.dailyStems) },
                  { label: "Tipo", value: point.isProjected ? "Proyectado" : "Real" },
                ];
              }}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="percent" name="% del total" isAnimationActive={false} radius={[3, 3, 0, 0]}>
          {percentData.map((point) => (
            <Cell
              key={point.weekKey}
              fill={point.isProjected ? PROJECTED_COLOR : OBSERVED_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    );
  }

  if (metric === "weight-per-stem") {
    return (
      <BarChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid {...gridConfig} />
        <XAxis {...axisConfig} dataKey="weekKey" tick={axisTickStyle} />
        <YAxis
          {...axisConfig}
          tick={axisTickStyle}
          tickFormatter={(value) => `${formatFlexibleNumber(Number(value))} g`}
        />
        <Tooltip
          content={
            <RechartsTooltipAdapter
              title={(label, payload) => buildTitle(label, payload)}
              mapPayload={(payload) => {
                const point = payload[0]?.payload as WeeklyHarvestPoint | undefined;
                if (!point) return [];
                return [
                  {
                    label: "Peso / tallo (ponderado)",
                    value: point.weeklyWeightPerStemG !== null ? `${formatFlexibleNumber(point.weeklyWeightPerStemG)} g` : "-",
                  },
                  { label: "Tallos semana", value: formatFlexibleNumber(point.dailyStems) },
                  { label: "Kg semana", value: formatFlexibleNumber(point.weeklyGreenKg) },
                  { label: "Dias con corte", value: formatFlexibleNumber(point.daysCount) },
                  { label: "Tipo", value: point.isProjected ? "Proyectado" : "Real" },
                ];
              }}
            />
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="weeklyWeightPerStemG" name="Peso / tallo (g)" isAnimationActive={false} radius={[3, 3, 0, 0]}>
          {data.map((point) => (
            <Cell
              key={point.weekKey}
              fill={point.isProjected ? PROJECTED_COLOR : OBSERVED_COLOR}
            />
          ))}
        </Bar>
      </BarChart>
    );
  }

  // metric === "daily"
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
            title={(label, payload) => buildTitle(label, payload)}
            mapPayload={(payload) => {
              const point = payload[0]?.payload as WeeklyHarvestPoint | undefined;
              if (!point) return [];
              return [
                { label: "Tallos semana", value: formatFlexibleNumber(point.dailyStems) },
                { label: "Acumulado", value: formatFlexibleNumber(point.cumulativeStems) },
                { label: "Dias con corte", value: formatFlexibleNumber(point.daysCount) },
                { label: "Tipo", value: point.isProjected ? "Proyectado" : "Real" },
              ];
            }}
          />
        }
      />
      <Legend wrapperStyle={{ fontSize: 12 }} />
      <Bar dataKey="dailyStems" name="Tallos semana" isAnimationActive={false} radius={[3, 3, 0, 0]}>
        {data.map((point) => (
          <Cell
            key={point.weekKey}
            fill={point.isProjected ? PROJECTED_COLOR : OBSERVED_COLOR}
          />
        ))}
      </Bar>
    </BarChart>
  );
}
