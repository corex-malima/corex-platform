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
  initialCycle?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Reference line config — median + rSmad + rSiqr bands
// ─────────────────────────────────────────────────────────────────────────────

type RefLineSpec =
  | { kind: "fixed"; key: "median"; label: string; color: string; dash?: string }
  | { kind: "derived"; base: "median"; offset: "rSmad" | "rSiqr"; sign: 1 | -1; label: string; color: string; dash: string };

const REF_LINE_CONFIG: RefLineSpec[] = [
  { kind: "fixed", key: "median", label: "Me", color: "var(--color-chart-success-bold)" },
  { kind: "derived", base: "median", offset: "rSmad", sign: -1, label: "Me-rSmad", color: "var(--color-chart-info-bold)", dash: "5 3" },
  { kind: "derived", base: "median", offset: "rSmad", sign:  1, label: "Me+rSmad", color: "var(--color-chart-info-bold)", dash: "5 3" },
  { kind: "derived", base: "median", offset: "rSiqr", sign: -1, label: "Me-rSiqr", color: "var(--color-chart-warning)", dash: "2 3" },
  { kind: "derived", base: "median", offset: "rSiqr", sign:  1, label: "Me+rSiqr", color: "var(--color-chart-warning)", dash: "2 3" },
];

function resolveRefX(spec: RefLineSpec, row: AlturasDronStatsRow): number | null {
  if (spec.kind === "fixed") {
    return row[spec.key] ?? null;
  }
  const base = row.median;
  const offset = row[spec.offset];
  if (base == null || offset == null) return null;
  return base + spec.sign * offset;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Build a human-readable display label for a cycle option */
function cycleLabel(cycleKey: string, statsRows: AlturasDronStatsRow[]): string {
  // Find the most recent row for this cycleKey to get metadata
  const row = statsRows
    .filter((s) => s.cycleKey === cycleKey)
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate))[0];
  if (!row) return cycleKey;
  const parts: string[] = [];
  if (row.variety) parts.push(row.variety);
  if (row.spType) parts.push(row.spType);
  return parts.length > 0 ? `${cycleKey} (${parts.join(" · ")})` : cycleKey;
}

/** Label shown in the slider timeline */
function dateLabel(date: string, vegetativeDay: number | null): string {
  const formatted = formatDateSlash(date);
  if (vegetativeDay != null) return `Día veg. ${vegetativeDay} · ${formatted}`;
  return `${formatted} · Día veg: —`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AlturasDronHistogramScrubber({
  stats,
  ranges,
  initialCycle,
}: Props) {
  // ── 1. Cycle options (sorted, derived from ranges data) ──
  const allCycles = useMemo(
    () => [...new Set(ranges.map((r) => r.cycleKey))].sort(),
    [ranges],
  );

  const defaultCycle =
    initialCycle && allCycles.includes(initialCycle)
      ? initialCycle
      : (allCycles[0] ?? "");

  const [selectedCycle, setSelectedCycle] = useState(defaultCycle);

  // ── 2. Dates available for the selected cycle ──
  const availableDates = useMemo(() => {
    const dateSet = new Set<string>();
    for (const r of ranges) {
      if (r.cycleKey === selectedCycle) dateSet.add(r.eventDate);
    }
    return [...dateSet].sort(); // ASC
  }, [ranges, selectedCycle]);

  // ── 3. Slider: index into availableDates, default = last (most recent) ──
  const [dateIndex, setDateIndex] = useState(() =>
    Math.max(0, availableDates.length - 1),
  );

  // Reset index to last date when cycle changes
  const handleCycleChange = (cycle: string) => {
    setSelectedCycle(cycle);
    const newDates = [...new Set(
      ranges.filter((r) => r.cycleKey === cycle).map((r) => r.eventDate),
    )].sort();
    setDateIndex(Math.max(0, newDates.length - 1));
  };

  const selectedDate = availableDates[dateIndex] ?? null;

  // ── 4. Histogram data for selected cycle + date ──
  const histogramData = useMemo(() => {
    if (!selectedDate) return [];
    return ranges
      .filter((r) => r.cycleKey === selectedCycle && r.eventDate === selectedDate)
      .sort((a, b) => a.alturaM - b.alturaM);
  }, [ranges, selectedCycle, selectedDate]);

  // ── 5. vegetativeDay for selected date (from ranges) ──
  const selectedVegetativeDay = useMemo(() => {
    if (!selectedDate) return null;
    return histogramData[0]?.vegetativeDay ?? null;
  }, [histogramData, selectedDate]);

  // ── 6. Stats row for selected cycle + date ──
  const statsRow: AlturasDronStatsRow | null = useMemo(() => {
    if (!selectedDate) return null;
    return (
      stats.find(
        (s) => s.cycleKey === selectedCycle && s.eventDate === selectedDate,
      ) ?? null
    );
  }, [stats, selectedCycle, selectedDate]);

  // ── 7. Chart title ──
  const chartTitle = useMemo(() => {
    if (!statsRow) return `Histograma temporal — Ciclo ${selectedCycle}`;
    const parts: string[] = [`Ciclo ${statsRow.cycleKey}`];
    if (statsRow.variety) parts.push(statsRow.variety);
    if (statsRow.spType) parts.push(statsRow.spType);
    parts.push(`Bloque ${statsRow.parentBlock}`);
    return `Histograma temporal — ${parts.join(" · ")}`;
  }, [statsRow, selectedCycle]);

  // ── 8. Build cycle option list for select ──
  const cycleOptions = useMemo(
    () => allCycles.map((c) => cycleLabel(c, stats)),
    [allCycles, stats],
  );

  // Map display label back to cycleKey
  const cycleKeyFromLabel = useMemo(() => {
    const map = new Map<string, string>();
    allCycles.forEach((c) => map.set(cycleLabel(c, stats), c));
    return map;
  }, [allCycles, stats]);

  // ── Edge case: no cycles at all ──
  if (allCycles.length === 0) {
    return (
      <ChartSurface title="Histograma temporal del ciclo">
        <EmptyState label="No hay datos de distribución de alturas disponibles." />
      </ChartSurface>
    );
  }

  const hasData = availableDates.length > 0 && histogramData.length > 0;

  const selectedCycleLabel = cycleLabel(selectedCycle, stats);

  return (
    <ChartSurface title={chartTitle}>
      {/* ── Controls row ── */}
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="min-w-[240px] max-w-[360px]">
          <SingleSelectField
            id="histogram-cycle-select"
            label="Ciclo"
            value={selectedCycleLabel}
            options={cycleOptions}
            onChange={(label) => {
              const key = cycleKeyFromLabel.get(label);
              if (key) handleCycleChange(key);
            }}
            omitEmpty
          />
        </div>
      </div>

      {/* ── Slider section ── */}
      {availableDates.length === 0 ? (
        <EmptyState label="Sin mediciones para este ciclo." />
      ) : (
        <>
          {/* Scrubber */}
          <div className="mb-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {availableDates[0]
                  ? dateLabel(availableDates[0], null)
                  : "—"}
              </span>
              <span className="font-medium text-foreground">
                {selectedDate
                  ? dateLabel(selectedDate, selectedVegetativeDay)
                  : "—"}
                {availableDates.length > 1 && (
                  <span className="ml-2 font-normal text-muted-foreground">
                    • {dateIndex + 1} de {availableDates.length} mediciones
                  </span>
                )}
              </span>
              <span>
                {availableDates[availableDates.length - 1]
                  ? dateLabel(availableDates[availableDates.length - 1], null)
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
                  const pct =
                    availableDates.length > 1
                      ? (i / (availableDates.length - 1)) * 100
                      : 50;
                  const isActive = i === dateIndex;
                  return (
                    <span
                      key={i}
                      style={{ left: `${pct}%` }}
                      className={`absolute -translate-x-1/2 select-none text-[9px] leading-none ${
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
                          selectedDate
                            ? dateLabel(selectedDate, selectedVegetativeDay)
                            : ""
                        }
                        mapPayload={(payload, label) => [
                          {
                            label: "Altura",
                            value:
                              label !== undefined
                                ? `${formatDecimal(Number(label), 2)} m`
                                : "—",
                          },
                          {
                            label: "Distribución",
                            value:
                              payload[0]?.value !== undefined
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

                  {/* Reference lines: median + rSmad/rSiqr bands */}
                  {statsRow &&
                    REF_LINE_CONFIG.map((cfg, i) => {
                      const val = resolveRefX(cfg, statsRow);
                      if (val == null) return null;
                      const isMedian = cfg.kind === "fixed";
                      return (
                        <ReferenceLine
                          key={i}
                          x={val}
                          stroke={cfg.color}
                          strokeWidth={isMedian ? 2 : 1.5}
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
                  {statsRow.vegetativeDay != null && (
                    <StatItem
                      label="Día veg."
                      value={String(statsRow.vegetativeDay)}
                    />
                  )}
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
                    label="rSmad"
                    value={
                      statsRow.rSmad != null
                        ? `${formatDecimal(statsRow.rSmad, 3)} m`
                        : "—"
                    }
                  />
                  <StatItem
                    label="rSiqr"
                    value={
                      statsRow.rSiqr != null
                        ? `${formatDecimal(statsRow.rSiqr, 3)} m`
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
                    highlight={
                      statsRow.cv != null
                        ? statsRow.cv < 0.25
                          ? "success"
                          : statsRow.cv < 0.4
                            ? "warning"
                            : "danger"
                        : undefined
                    }
                  />
                  <StatItem
                    label="rCVmad"
                    value={
                      statsRow.rCvmad != null
                        ? formatPercent(statsRow.rCvmad, {
                            input: "ratio",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })
                        : "—"
                    }
                  />
                  <StatItem
                    label="rCViqr"
                    value={
                      statsRow.rCviqr != null
                        ? formatPercent(statsRow.rCviqr, {
                            input: "ratio",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 1,
                          })
                        : "—"
                    }
                  />
                  {statsRow.gini != null && (
                    <StatItem
                      label="Gini"
                      value={formatDecimal(statsRow.gini, 3)}
                    />
                  )}
                  {statsRow.entropyNorm != null && (
                    <StatItem
                      label="Hn"
                      value={formatDecimal(statsRow.entropyNorm, 3)}
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
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

const HIGHLIGHT_COLOR: Record<string, string> = {
  success: "var(--color-chart-success-bold)",
  warning: "var(--color-chart-warning)",
  danger: "var(--color-chart-danger)",
};

function StatItem({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "success" | "warning" | "danger";
}) {
  const color = highlight ? HIGHLIGHT_COLOR[highlight] : undefined;
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      {label}
      <span
        className="ml-1 font-semibold tabular-nums"
        style={color ? { color } : { color: "var(--foreground)" }}
      >
        {value}
      </span>
    </span>
  );
}
