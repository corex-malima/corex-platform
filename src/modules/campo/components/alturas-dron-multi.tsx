"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { Button } from "@/shared/ui/button";
import { ToggleChipGroup } from "@/shared/filters/toggle-chip-group";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import {
  axisConfig,
  axisTickStyle,
  gridConfig,
} from "@/shared/charts/chart-axis-config";
import { formatDecimal } from "@/shared/lib/format";
import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";
import { Card } from "@/shared/ui/card";

export interface AlturasDronMultiProps {
  stats: AlturasDronStatsRow[];
}

interface BlockChartData {
  eventDate: string;
  [key: string]: string | number;
}

interface RegressionStat {
  block: string;
  slope: number;
  r2: number;
}

// Función de regresión lineal local
function linearRegression(
  xs: number[],
  ys: number[],
): { slope: number; intercept: number; r2: number; n: number } | null {
  if (xs.length < 2) return null;
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);

  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const ssRes = ys.reduce(
    (a, y, i) => a + Math.pow(y - (intercept + slope * xs[i]), 2),
    0,
  );
  const ssTot = ys.reduce((a, y) => a + Math.pow(y - sumY / n, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, n };
}

function getTrendColor(slope: number): string {
  return slope > 0 ? "hsl(var(--color-success))" : "hsl(var(--color-danger))";
}

export function AlturasDronMulti({ stats }: AlturasDronMultiProps) {
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [showRegression, setShowRegression] = useState(false);

  const uniqueBlocks = useMemo(
    () => [...new Set(stats.map((s) => s.parentBlock))].sort(),
    [stats],
  );

  const blockChips = useMemo(
    () =>
      uniqueBlocks.map((block) => ({
        value: block,
        label: block,
      })),
    [uniqueBlocks],
  );

  // Inicializar con el primer bloque si hay
  const displayedBlocks = useMemo(() => {
    if (selectedBlocks.length > 0) return selectedBlocks;
    if (uniqueBlocks.length > 0) return [uniqueBlocks[0]];
    return [];
  }, [selectedBlocks, uniqueBlocks]);

  // Construir datos para el chart
  const chartData = useMemo((): BlockChartData[] => {
    const grouped = new Map<string, Partial<BlockChartData>>();

    stats.forEach((row) => {
      if (!grouped.has(row.eventDate)) {
        grouped.set(row.eventDate, { eventDate: row.eventDate });
      }
      const item = grouped.get(row.eventDate)!;
      if (row.alturaM !== null) {
        item[row.parentBlock] = row.alturaM;
      }
    });

    return Array.from(grouped.values())
      .map((item) => item as BlockChartData)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  }, [stats]);

  // Calcular regresiones por bloque
  const regressionStats = useMemo((): RegressionStat[] => {
    const minDate = chartData[0]?.eventDate;
    if (!minDate) return [];

    const minDateObj = new Date(minDate);
    const results: RegressionStat[] = [];

    displayedBlocks.forEach((block) => {
      const xs: number[] = [];
      const ys: number[] = [];

      chartData.forEach((item) => {
        const dateObj = new Date(item.eventDate);
        const daysDiff = Math.floor(
          (dateObj.getTime() - minDateObj.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (item[block] !== undefined && typeof item[block] === "number") {
          xs.push(daysDiff);
          ys.push(item[block] as number);
        }
      });

      if (xs.length > 1) {
        const reg = linearRegression(xs, ys);
        if (reg) {
          results.push({
            block,
            slope: reg.slope,
            r2: reg.r2,
          });
        }
      }
    });

    return results;
  }, [chartData, displayedBlocks]);

  function selectAll() {
    setSelectedBlocks(uniqueBlocks);
  }

  function clearSelection() {
    setSelectedBlocks([]);
  }

  if (stats.length === 0) return null;

  return (
    <ChartSection>
      <ChartSurface
        title="Comparación temporal por bloque"
        subtitle="Click bloque para alternar selección. Toggle Regresión para ver pendiente diaria + R²."
      >
        <div className="grid grid-cols-[280px_1fr] gap-4 mb-4">
          <div className="space-y-3">
            <ToggleChipGroup
              options={blockChips}
              selected={selectedBlocks}
              onChange={setSelectedBlocks}
            />
            <div className="flex flex-col gap-2">
              <Button size="sm" onClick={selectAll} variant="outline">
                Todos
              </Button>
              <Button size="sm" onClick={clearSelection} variant="outline">
                Limpiar
              </Button>
              <Button
                size="sm"
                variant={showRegression ? "default" : "outline"}
                onClick={() => setShowRegression(!showRegression)}
              >
                📈 Regresión
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData} {...axisConfig}>
                <CartesianGrid {...gridConfig} />
                <XAxis
                  dataKey="eventDate"
                  tick={axisTickStyle}
                  angle={-45}
                  height={80}
                />
                <YAxis
                  label={{
                    value: "Altura (m)",
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
                          label: item.name || "Altura",
                          value: String(item.value ?? "—"),
                        }))
                      }
                    />
                  }
                />

                {displayedBlocks.map((block) => {
                  const trend =
                    regressionStats.find((r) => r.block === block)?.slope ?? 0;
                  return (
                    <Line
                      key={`line-${block}`}
                      type="monotone"
                      dataKey={block}
                      stroke={getTrendColor(trend)}
                      dot={false}
                      isAnimationActive={false}
                      strokeWidth={2}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>

            {showRegression && regressionStats.length > 0 && (
              <Card className="border p-3 bg-muted/40">
                <div className="text-xs font-semibold uppercase tracking-wide mb-2">
                  Análisis de regresión (m/día)
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {regressionStats.map((stat) => (
                    <div
                      key={stat.block}
                      className="p-2 bg-background rounded border"
                    >
                      <div className="font-medium">{stat.block}</div>
                      <div className="text-muted-foreground">
                        Pendiente:{" "}
                        <span
                          style={{
                            color: getTrendColor(stat.slope),
                          }}
                        >
                          {formatDecimal(stat.slope)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        R²: {formatDecimal(stat.r2)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </ChartSurface>
    </ChartSection>
  );
}
