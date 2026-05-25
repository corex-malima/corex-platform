"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import type { AlturasDronStatsRow, AlturasDronRangeRow } from "@/lib/campo-alturas-dron";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState } from "@/shared/data-display/empty-state";
import { SingleSelectField } from "@/shared/filters/single-select-field";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import {
  axisConfig,
  axisTickStyle,
  gridConfig,
  tooltipCursorStyle,
} from "@/shared/charts/chart-axis-config";
import { formatDecimal, formatPercent, formatDateSlash } from "@/shared/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  stats: AlturasDronStatsRow[];
  ranges: AlturasDronRangeRow[];
  initialBlock?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Reference line config
// ─────────────────────────────────────────────────────────────────────────────

const REF_LINE_CONFIG = [
  {
    key: "p10" as const,
    label: "P10",
    color: "var(--color-chart-info-bold)",
    dash: "4 2",
  },
  {
    key: "p25" as const,
    label: "Q1",
    color: "var(--color-chart-warning)",
    dash: "5 3",
  },
  {
    key: "median" as const,
    label: "Me",
    color: "var(--color-chart-success-bold)",
    dash: undefined,
  },
  {
    key: "p75" as const,
    label: "Q3",
    color: "var(--color-chart-warning)",
    dash: "5 3",
  },
  {
    key: "p90" as const,
    label: "P90",
    color: "var(--color-chart-info-bold)",
    dash: "4 2",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AlturasDronHistogramScrubber({
  stats,
  ranges,
  initialBlock,
}: Props) {
  // ── 1. Block options (sorted alphabetically, derived from ranges data) ──
  const allBlocks = useMemo(
    () => [...new Set(ranges.map((r) => r.parentBlock))].sort(),
    [ranges],
  );

  const defaultBlock =
    initialBlock && allBlocks.includes(initialBlock)
      ? initialBlock
      : (allBlocks[0] ?? "");

  const [selectedBlock, setSelectedBlock] = useState(defaultBlock);

  // ── 2. Dates available for the selected block ──
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const r of ranges) {
      if (r.parentBlock === selectedBlock) dateSet.add(r.eventDate);
    }
    return [...dateSet].sort(); // ASC
  }, [ranges, selectedBlock]);

  // ── 3. Slider: index into availableDates, default = last (most recent) ──
  const [dateIndex, setDateIndex] = useState(() =>
    Math.max(0, availableDates.length - 1),
  );

  // Reset index to last date when block changes
  const handleBlockChange = (block: string) => {
    setSelectedBlock(block);
    // Compute new available dates for the block to get the last index
    const newDates = [...new Set(
      ranges.filter((r) => r.parentBlock === block).map((r) => r.eventDate),
    )].sort();
    setDateIndex(Math.max(0, newDates.length - 1));
  };

  const selectedDate = availableDates[dateIndex] ?? null;

  // ── 4. Histogram data for selected block + date ──
  const histogramData = useMemo(() => {
    if (!selectedDate) return [];
    return ranges
      .filter((r) => r.parentBlock === selectedBlock && r.eventDate === selectedDate)
      .sort((a, b) => a.alturaM - b.alturaM);
  }, [ranges, selectedBlock, selectedDate]);

  // ── 5. Stats row for selected block + date ──
  const statsRow: AlturasDronStatsRow | null = useMemo(() => {
    if (!selectedDate) return null;
    return (
      stats.find(
        (s) => s.parentBlock === selectedBlock && s.eventDate === selectedDate,
      ) ?? null
    );
  }, [stats, selectedBlock, selectedDate]);

  // ── Edge case: no blocks at all ──
  if (allBlocks.length === 0) {
    return (
      <ChartSurface title="Histograma temporal del bloque">
        <EmptyState label="No hay datos de distribución de alturas disponibles." />
      </ChartSurface>
    );
  }

  // ── Edge case: selected block has no dates ──
  const hasData = availableDates.length > 0 && histogramData.length > 0;

  return (
    <ChartSurface title="Histograma temporal del bloque">
      {/* ── Controls row ── */}
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] max-w-[280px]">
          <SingleSelectField
            id="histogram-block-select"
            label="Bloque"
            value={selectedBlock}
            options={allBlocks}
            onChange={handleBlockChange}
            omitEmpty
          />
        </div>
      </div>

      {/* ── Slider section ── */}
      {availableDates.length === 0 ? (
        <EmptyState label="Sin mediciones para este bloque." />
      ) : (
        <>
          {/* Scrubber */}
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{availableDates[0] ? formatDateSlash(availableDates[0]) : "—"}</span>
              <span className="font-medium text-foreground">
                {selectedDate ? formatDateSlash(selectedDate) : "—"}
                {availableDates.length > 1 && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    • {dateIndex + 1} de {availableDates.length} mediciones
                  </span>
                )}
              </span>
              <span>
                {availableDates[availableDates.length - 1]
                  ? formatDateSlash(availableDates[availableDates.length - 1])
                  : "—"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, availableDates.length - 1)}
              step={1}
              value={dateIndex}
              onChange={(e) => setDateIndex(Number(e.target.value))}
              aria-label="Seleccionar fecha de medición"
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-border accent-[var(--color-chart-primary)]"
            />
            {/* Tick marks */}
            {availableDates.length > 1 && (
              <div className="relative h-3">
                {availableDates.map((_, i) => {
                  const pct = availableDates.length > 1
                    ? (i / (availableDates.length - 1)) * 100
                    : 50;
                  const isActive = i === dateIndex;
                  return (
                    <span
                      key={i}
                      style={{ left: `${pct}%` }}
                      className={`absolute -translate-x-1/2 text-[9px] leading-none select-none ${
                        isActive
                          ? "font-bold text-foreground"
                          : "text-muted-foreground/50"
                      }`}
                      aria-hidden
                    >
                      |
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Chart area ── */}
          {!hasData ? (
            <EmptyState label="Sin datos de histograma para la fecha seleccionada." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={histogramData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                >
                  <CartesianGrid {...gridConfig} />
                  <XAxis
                    dataKey="alturaM"
                    {...axisConfig}
                    tick={axisTickStyle}
                    label={{
                      value: "Altura (m)",
                      position: "insideBottom",
                      offset: -2,
                      style: { ...axisTickStyle, fontSize: 10 },
                    }}
                    tickFormatter={(v: number) => formatDecimal(v, 2)}
                  />
                  <YAxis
                    {...axisConfig}
                    tick={axisTickStyle}
                    tickFormatter={(v: number) =>
                      formatPercent(v, {
                        input: "percent",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })
                    }
                    label={{
                      value: "Distribución (%)",
                      angle: -90,
                      position: "insideLeft",
                      offset: 10,
                      style: { ...axisTickStyle, fontSize: 10 },
                    }}
                  />
                  <Tooltip
                    cursor={tooltipCursorStyle}
                    content={
                      <RechartsTooltipAdapter
                        title={() =>
                          selectedDate ? formatDateSlash(selectedDate) : ""
                        }
                        mapPayload={(payload, label) => [
                          {
                            label: "Altura",
                            value: label !== undefined
                              ? `${formatDecimal(Number(label), 2)} m`
                              : "—",
                          },
                          {
                            label: "Distribución",
                            value: payload[0]?.value !== undefined
                              ? formatPercent(payload[0].value, {
                                  input: "percent",
                                  minimumFractionDigits: 1,
                                  maximumFractionDigits: 1,
                                })
                              : "—",
                          },
                        ]}
                      />
                    }
                  />

                  {/* Distribution bars */}
                  <Bar
                    dataKey="distPrc"
                    fill="var(--color-chart-primary)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={40}
                    isAnimationActive={false}
                  />

                  {/* Reference lines (only render if statsRow has the value) */}
                  {statsRow &&
                    REF_LINE_CONFIG.map((cfg) => {
                      const val = statsRow[cfg.key];
                      if (val == null) return null;
                      return (
                        <ReferenceLine
                          key={cfg.key}
                          x={val}
                          stroke={cfg.color}
                          strokeWidth={cfg.key === "median" ? 2 : 1.5}
                          strokeDasharray={cfg.dash}
                          label={{
                            value: cfg.label,
                            position: "top",
                            style: {
                              fill: cfg.color,
                              fontSize: 10,
                              fontWeight: 600,
                            },
                          }}
                        />
                      );
                    })}
                </BarChart>
              </ResponsiveContainer>

              {/* ── Stats strip below chart ── */}
              {statsRow && (
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 rounded-[10px] border border-border/60 bg-muted/30 px-4 py-2.5 text-xs">
                  <StatItem
                    label="E[x]"
                    value={`${formatDecimal(statsRow.mean, 2)} m`}
                  />
                  <StatItem
                    label="Me"
                    value={
                      statsRow.median != null
                        ? `${formatDecimal(statsRow.median, 2)} m`
                        : "—"
                    }
                  />
                  <StatItem
                    label="S"
                    value={
                      statsRow.sd != null
                        ? `${formatDecimal(statsRow.sd, 3)} m`
                        : "—"
                    }
                  />
                  <StatItem
                    label="CV"
                    value={
                      statsRow.cv != null
                        ? formatPercent(statsRow.cv, {
                            input: "ratio",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })
                        : "—"
                    }
                  />
                  <StatItem
                    label="IQR"
                    value={
                      statsRow.iqr != null
                        ? `${formatDecimal(statsRow.iqr, 3)} m`
                        : "—"
                    }
                  />
                  {statsRow.gini != null && (
                    <StatItem
                      label="Gini"
                      value={formatDecimal(statsRow.gini, 3)}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </ChartSurface>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helper
// ─────────────────────────────────────────────────────────────────────────────

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      {label}
      <span className="ml-1 font-semibold tabular-nums text-foreground">
        {value}
      </span>
    </span>
  );
}
