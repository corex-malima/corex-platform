"use client";

import {
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState } from "@/shared/data-display/empty-state";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import { axisConfig, axisTickStyle, gridConfig } from "@/shared/charts";
import { formatDecimal } from "@/shared/lib/format";
import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";

type Props = {
  stats: AlturasDronStatsRow[];
};

function getGiniColor(value: number | null): string {
  if (value === null || value === undefined) return "var(--color-muted)";
  if (value <= 0.25) return "var(--color-chart-success)";
  if (value <= 0.5) return "var(--color-chart-warning)";
  return "var(--color-chart-error)";
}

function getBowleyColor(value: number | null): string {
  if (value === null || value === undefined) return "var(--color-muted)";
  if (value < -0.2) return "var(--color-chart-info-bold)";
  if (value <= 0.2) return "var(--color-muted)";
  return "var(--color-chart-warning)";
}

function getEntropyColor(value: number | null): string {
  if (value === null || value === undefined) return "var(--color-muted)";
  if (value < 0.33) return "var(--color-muted)";
  if (value < 0.67) return "var(--color-chart-info)";
  return "var(--color-chart-success)";
}

export function AlturasDronVariabilityCharts({ stats }: Props) {
  if (!stats || stats.length === 0) {
    return (
      <ChartSection>
        <div className="grid gap-4 xl:grid-cols-3">
          {["Desigualdad interna (Gini)", "Asimetría amplia (Bowley V1)", "Diversidad (Hn)"].map(
            (title) => (
              <ChartSurface key={title} title={title}>
                <EmptyState label="No hay datos disponibles" />
              </ChartSurface>
            ),
          )}
        </div>
      </ChartSection>
    );
  }

  // Prepare data for each chart
  const giniData = [...stats]
    .filter((s) => s.gini !== null && s.gini !== undefined)
    .sort((a, b) => (b.gini ?? 0) - (a.gini ?? 0));

  const bowleyData = [...stats]
    .filter((s) => s.bowleyV1 !== null && s.bowleyV1 !== undefined)
    .sort((a, b) => (a.bowleyV1 ?? 0) - (b.bowleyV1 ?? 0));

  const entropyData = [...stats]
    .filter((s) => s.entropyNorm !== null && s.entropyNorm !== undefined)
    .sort((a, b) => (b.entropyNorm ?? 0) - (a.entropyNorm ?? 0));

  const hasGiniData = giniData.length > 0;
  const hasBowleyData = bowleyData.length > 0;
  const hasEntropyData = entropyData.length > 0;

  return (
    <ChartSection>
      <div className="grid gap-4 xl:grid-cols-3">
        {/* Gini Chart */}
        <ChartSurface title="Desigualdad interna (Gini)">
          {hasGiniData ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={giniData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid {...gridConfig} />
                <XAxis
                  {...axisConfig}
                  dataKey="parentBlock"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ ...axisTickStyle }}
                />
                <YAxis
                  {...axisConfig}
                  tick={{ ...axisTickStyle }}
                  domain={[0, 1]}
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
                            { label: "Bloque", value: String(label) },
                          ];
                          for (const item of p) {
                            rows.push({
                              label: "Gini",
                              value:
                                item.value !== null && item.value !== undefined
                                  ? formatDecimal(Number(item.value))
                                  : "—",
                            });
                          }
                          return rows;
                        }}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="gini" fill="var(--color-muted)">
                  {giniData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={getGiniColor(entry.gini)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No hay datos de Gini" />
          )}
        </ChartSurface>

        {/* Bowley Chart */}
        <ChartSurface title="Asimetría amplia (Bowley V1)">
          {hasBowleyData ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={bowleyData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid {...gridConfig} />
                <XAxis
                  {...axisConfig}
                  dataKey="parentBlock"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ ...axisTickStyle }}
                />
                <YAxis
                  {...axisConfig}
                  tick={{ ...axisTickStyle }}
                  domain={[-1, 1]}
                />
                <ReferenceLine y={0} stroke="var(--color-border)" strokeDasharray="3 3" />
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
                            { label: "Bloque", value: String(label) },
                          ];
                          for (const item of p) {
                            rows.push({
                              label: "Bowley V1",
                              value:
                                item.value !== null && item.value !== undefined
                                  ? formatDecimal(Number(item.value))
                                  : "—",
                            });
                          }
                          return rows;
                        }}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="bowleyV1" fill="var(--color-muted)">
                  {bowleyData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={getBowleyColor(entry.bowleyV1)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No hay datos de Bowley V1" />
          )}
        </ChartSurface>

        {/* Entropy Chart */}
        <ChartSurface title="Diversidad (Hn)">
          {hasEntropyData ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={entropyData} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                <CartesianGrid {...gridConfig} />
                <XAxis
                  {...axisConfig}
                  dataKey="parentBlock"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ ...axisTickStyle }}
                />
                <YAxis
                  {...axisConfig}
                  tick={{ ...axisTickStyle }}
                  domain={[0, 1]}
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
                            { label: "Bloque", value: String(label) },
                          ];
                          for (const item of p) {
                            rows.push({
                              label: "Hn",
                              value:
                                item.value !== null && item.value !== undefined
                                  ? formatDecimal(Number(item.value))
                                  : "—",
                            });
                          }
                          return rows;
                        }}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="entropyNorm" fill="var(--color-muted)">
                  {entropyData.map((entry, idx) => (
                    <Cell
                      key={`cell-${idx}`}
                      fill={getEntropyColor(entry.entropyNorm)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No hay datos de Hn" />
          )}
        </ChartSurface>
      </div>
    </ChartSection>
  );
}
