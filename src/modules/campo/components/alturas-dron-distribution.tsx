"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { SingleSelectField } from "@/shared/filters/single-select-field";
import { ToggleChipGroup } from "@/shared/filters/toggle-chip-group";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import {
  axisConfig,
  axisTickStyle,
  gridConfig,
} from "@/shared/charts/chart-axis-config";
import { formatDecimal } from "@/shared/lib/format";
import { EmptyState } from "@/shared/data-display/empty-state";
import type { AlturasDronRangeRow } from "@/lib/campo-alturas-dron";
import { Input } from "@/shared/ui/input";

export interface AlturasDronDistributionProps {
  ranges: AlturasDronRangeRow[];
  blocks: string[];
}

type ChartType = "barV" | "barH" | "pie";

const CHART_TYPES = [
  { value: "barV" as const, label: "Barras V" },
  { value: "barH" as const, label: "Barras H" },
  { value: "pie" as const, label: "Pie" },
];

const PIE_COLORS = [
  "var(--chart-line-primary)",
  "var(--chart-line-secondary)",
  "var(--color-chart-success-bold)",
  "var(--color-chart-warning)",
  "var(--color-chart-info-bold)",
];

function getPieColor(index: number): string {
  return PIE_COLORS[index % PIE_COLORS.length];
}

export function AlturasDronDistribution({
  ranges,
  blocks,
}: AlturasDronDistributionProps) {
  const [selectedBlock, setSelectedBlock] = useState<string>(
    blocks[0] ?? "",
  );
  const [chartType, setChartType] = useState<ChartType>("barV");
  const [threshold, setThreshold] = useState(0);

  const blockOptions = useMemo(() => blocks, [blocks]);

  // Filtrar rangos por bloque y threshold
  const filteredRanges = useMemo(() => {
    return ranges
      .filter(
        (r) =>
          r.parentBlock === selectedBlock &&
          (r.distPrc ?? 0) >= threshold,
      )
      .sort((a, b) => (a.alturaM ?? 0) - (b.alturaM ?? 0));
  }, [ranges, selectedBlock, threshold]);

  if (ranges.length === 0) {
    return (
      <ChartSection>
        <ChartSurface title="Distribución de rangos del último día">
          <EmptyState />
        </ChartSurface>
      </ChartSection>
    );
  }

  return (
    <ChartSection>
      <ChartSurface
        title="Distribución de rangos del último día"
        subtitle="Selecciona un bloque para ver su histograma de altura."
      >
        <div className="grid grid-cols-[200px_1fr] gap-4">
          <div className="space-y-4">
            <SingleSelectField
              id="ad-dist-block"
              label="Bloque"
              value={selectedBlock}
              options={blockOptions}
              onChange={setSelectedBlock}
            />
            <div className="space-y-2">
              <div className="text-sm font-medium">Tipo de gráfico</div>
              <ToggleChipGroup
                options={CHART_TYPES}
                selected={[chartType]}
                onChange={(vals) => setChartType(vals[0] as ChartType)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide">
                Mín %: {threshold}
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <div>
            {filteredRanges.length === 0 ? (
              <div className="flex items-center justify-center h-80">
                <p className="text-muted-foreground text-sm">
                  Sin datos para {selectedBlock} con {threshold}% mínimo.
                </p>
              </div>
            ) : chartType === "barV" ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={filteredRanges} margin={{ top: 10, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid {...gridConfig} />
                  <XAxis
                    {...axisConfig}
                    dataKey="alturaM"
                    tick={axisTickStyle}
                    type="category"
                    tickFormatter={(v) => `${Number(v).toFixed(2)}`}
                    label={{ value: "Altura (m)", position: "insideBottomRight", offset: -5 }}
                  />
                  <YAxis
                    {...axisConfig}
                    label={{
                      value: "% Distribución",
                      angle: -90,
                      position: "insideLeft",
                    }}
                    tick={axisTickStyle}
                  />
                  <Tooltip
                    content={
                      <RechartsTooltipAdapter
                        mapPayload={(payload) =>
                          payload.map((item) => ({
                            label: item.name || "Distribución",
                            value: String(item.value ?? "—"),
                          }))
                        }
                      />
                    }
                  />
                  <Bar dataKey="distPrc" fill="var(--chart-line-primary)" />
                </BarChart>
              </ResponsiveContainer>
            ) : chartType === "barH" ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={filteredRanges}
                  layout="vertical"
                  margin={{ top: 10, right: 24, left: 0, bottom: 8 }}
                >
                  <CartesianGrid {...gridConfig} />
                  <XAxis {...axisConfig} type="number" tick={axisTickStyle} />
                  <YAxis
                    {...axisConfig}
                    dataKey="alturaM"
                    type="category"
                    tick={axisTickStyle}
                    width={50}
                    label={{ value: "m", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    content={
                      <RechartsTooltipAdapter
                        mapPayload={(payload) =>
                          payload.map((item) => ({
                            label: item.name || "Distribución",
                            value: String(item.value ?? "—"),
                          }))
                        }
                      />
                    }
                  />
                  <Bar dataKey="distPrc" fill="var(--chart-line-secondary)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={filteredRanges}
                    dataKey="distPrc"
                    nameKey="alturaM"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry) => {
                      const data = entry.payload as AlturasDronRangeRow;
                      return `${formatDecimal(data.alturaM ?? 0)}m (${formatDecimal(data.distPrc ?? 0)}%)`;
                    }}
                  >
                    {filteredRanges.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={getPieColor(index)} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={
                      <RechartsTooltipAdapter
                        mapPayload={(payload) =>
                          payload.map((item) => ({
                            label: item.name || "Altura",
                            value: `${String(item.value ?? "—")}%`,
                          }))
                        }
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </ChartSurface>
    </ChartSection>
  );
}
