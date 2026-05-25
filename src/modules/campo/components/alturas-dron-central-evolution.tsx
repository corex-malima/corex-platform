"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState } from "@/shared/data-display/empty-state";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import { axisConfig, axisTickStyle, gridConfig } from "@/shared/charts";
import { formatDecimal, formatDateSlash } from "@/shared/lib/format";
import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";

type Props = {
  stats: AlturasDronStatsRow[];
  selectedBlock?: string;
};

type ChartDataPoint = {
  eventDate: string;
  mean: number | null;
  median: number | null;
  p25: number | null;
  p75: number | null;
};

export function AlturasDronCentralEvolution({ stats, selectedBlock }: Props) {
  if (!stats || stats.length === 0) {
    return (
      <ChartSection>
        <ChartSurface title="Evolución temporal — altura central">
          <EmptyState label="No hay datos disponibles" />
        </ChartSurface>
      </ChartSection>
    );
  }

  // Filter and prepare data
  let filteredStats = stats;
  if (selectedBlock) {
    filteredStats = stats.filter((s) => s.parentBlock === selectedBlock);
  }

  if (filteredStats.length === 0) {
    return (
      <ChartSection>
        <ChartSurface title="Evolución temporal — altura central">
          <EmptyState label="No hay datos disponibles para este bloque" />
        </ChartSurface>
      </ChartSection>
    );
  }

  // Prepare chart data
  const chartData: ChartDataPoint[] = selectedBlock
    ? // Single block: direct mapping sorted by date
      [...filteredStats]
        .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
        .map((s) => ({
          eventDate: s.eventDate,
          mean: s.mean ?? null,
          median: s.median ?? null,
          p25: s.p25 ?? null,
          p75: s.p75 ?? null,
        }))
    : // Multiple blocks: aggregate by eventDate (median of medians, Q1/Q3 of medians)
      Array.from(
        filteredStats.reduce(
          (acc, s) => {
            const key = s.eventDate;
            if (!acc.has(key)) {
              acc.set(key, []);
            }
            acc.get(key)!.push(s);
            return acc;
          },
          new Map<string, typeof filteredStats>(),
        ),
      )
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([eventDate, blockStats]) => {
          const medians = blockStats
            .map((s) => s.median)
            .filter((m) => m !== null && m !== undefined) as number[];
          const means = blockStats
            .map((s) => s.mean)
            .filter((m) => m !== null && m !== undefined) as number[];

          if (medians.length === 0) {
            return { eventDate, mean: null, median: null, p25: null, p75: null };
          }

          // Calculate percentiles
          const sorted = [...medians].sort((a, b) => a - b);
          const q1Idx = Math.floor(sorted.length * 0.25);
          const q3Idx = Math.ceil(sorted.length * 0.75);
          const medianVal = sorted[Math.floor(sorted.length / 2)];

          return {
            eventDate,
            mean: means.length > 0 ? means.reduce((a, b) => a + b) / means.length : null,
            median: medianVal,
            p25: sorted[q1Idx] ?? medianVal,
            p75: sorted[q3Idx] ?? medianVal,
          };
        });

  return (
    <ChartSection>
      <ChartSurface title="Evolución temporal — altura central">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid {...gridConfig} />
            <XAxis
              {...axisConfig}
              dataKey="eventDate"
              tick={{ ...axisTickStyle }}
              tickFormatter={(date: string) => formatDateSlash(date)}
            />
            <YAxis
              {...axisConfig}
              tick={{ ...axisTickStyle }}
              label={{ value: "Altura (m)", angle: -90, position: "insideLeft", offset: 10 }}
              domain={["dataMin - 0.05", "dataMax + 0.05"]}
            />
            <Tooltip
              content={({ active, payload, label }) =>
                payload ? (
                  <RechartsTooltipAdapter
                    active={active}
                    payload={
                      payload as Array<{
                        name?: string;
                        value?: number | string;
                        payload?: Record<string, unknown>;
                      }>
                    }
                    label={label}
                    mapPayload={(p) => {
                      const rows: Array<{ label: string; value: string }> = [
                        {
                          label: "Fecha",
                          value: label ? formatDateSlash(String(label)) : "—",
                        },
                      ];
                      for (const item of p) {
                        rows.push({
                          label:
                            item.name === "mean"
                              ? "Media"
                              : item.name === "median"
                                ? "Mediana"
                                : item.name ?? "—",
                          value:
                            item.value !== null && item.value !== undefined
                              ? `${formatDecimal(Number(item.value))} m`
                              : "—",
                        });
                      }
                      return rows;
                    }}
                  />
                ) : null
              }
            />
            <Legend
              wrapperStyle={{ paddingTop: "16px" }}
              iconType="line"
              height={24}
            />
            <Area
              type="monotone"
              dataKey="p25"
              fill="var(--color-chart-info-soft)"
              stroke="transparent"
              dot={false}
              isAnimationActive={false}
              name="Q1–Q3"
              stackId="quantile"
            />
            <Area
              type="monotone"
              dataKey="p75"
              fill="transparent"
              stroke="transparent"
              dot={false}
              isAnimationActive={false}
              stackId="quantile"
            />
            <Line
              type="monotone"
              dataKey="mean"
              stroke="var(--chart-line-primary)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              name="Media"
            />
            <Line
              type="monotone"
              dataKey="median"
              stroke="var(--chart-line-secondary)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
              name="Mediana"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartSurface>
    </ChartSection>
  );
}
