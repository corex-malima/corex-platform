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
  if (cv === null || cv === undefined) return "hsl(var(--color-chart-2))";
  if (cv >= 0.4) return "hsl(var(--color-danger))";
  if (cv >= 0.25) return "hsl(var(--color-warning))";
  return "hsl(var(--color-success))";
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
            <BarChart data={alturaData} {...axisConfig}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                dataKey="parentBlock"
                tick={axisTickStyle}
                angle={-45}
                height={80}
              />
              <YAxis
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
              <Bar dataKey="alturaM" fill="hsl(var(--color-chart-1))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartSurface>

        {/* CV por bloque */}
        <ChartSurface title="Coeficiente de Variación por bloque">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={alturaData} {...axisConfig}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                dataKey="parentBlock"
                tick={axisTickStyle}
                angle={-45}
                height={80}
              />
              <YAxis
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
              <Bar dataKey="cv" fill="hsl(var(--color-chart-2))">
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
