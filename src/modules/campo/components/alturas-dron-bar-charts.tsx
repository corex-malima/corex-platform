"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import {
  axisConfig,
  axisTickStyle,
  gridConfig,
} from "@/shared/charts/chart-axis-config";
import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";

export interface AlturasDronBarChartsProps {
  statsLastDate: AlturasDronStatsRow[];
}

function getCvAccentColor(cv: number | null): string {
  if (cv === null || cv === undefined) return "var(--chart-line-secondary)";
  if (cv >= 0.4) return "var(--color-chart-danger)";
  if (cv >= 0.25) return "var(--color-chart-warning)";
  return "var(--color-chart-success-bold)";
}

export function AlturasDronBarCharts({ statsLastDate }: AlturasDronBarChartsProps) {
  if (statsLastDate.length === 0) return null;

  // Sort altura descending
  const alturaData = [...statsLastDate].sort((a, b) => b.alturaM - a.alturaM);

  return (
    <ChartSection>
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Altura por bloque */}
        <ChartSurface title="Altura por bloque (m)">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alturaData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                {...axisConfig}
                dataKey="parentBlock"
                tick={axisTickStyle}
                angle={-45}
                height={80}
              />
              <YAxis
                {...axisConfig}
                label={{ value: "Altura (m)", angle: -90, position: "insideLeft" }}
                tick={axisTickStyle}
              />
              <Tooltip
                content={
                  <RechartsTooltipAdapter
                    mapPayload={(payload) =>
                      payload.map((item) => ({
                        label: item.name || "Altura",
                        value: String(item.value ?? "—"),
                      }))
                    }
                  />
                }
              />
              <Bar dataKey="alturaM" fill="var(--chart-line-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartSurface>

        {/* CV por bloque */}
        <ChartSurface title="Coeficiente de Variación por bloque">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alturaData} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                {...axisConfig}
                dataKey="parentBlock"
                tick={axisTickStyle}
                angle={-45}
                height={80}
              />
              <YAxis
                {...axisConfig}
                label={{ value: "CV", angle: -90, position: "insideLeft" }}
                tick={axisTickStyle}
              />
              <Tooltip
                content={
                  <RechartsTooltipAdapter
                    mapPayload={(payload) =>
                      payload.map((item) => ({
                        label: item.name || "Altura",
                        value: String(item.value ?? "—"),
                      }))
                    }
                  />
                }
              />
              <Bar dataKey="cv" fill="var(--chart-line-secondary)">
                {alturaData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getCvAccentColor(entry.cv)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartSurface>
      </div>
    </ChartSection>
  );
}
