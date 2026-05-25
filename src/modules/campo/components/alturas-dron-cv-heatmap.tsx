"use client";

import { useMemo, useState } from "react";

import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";
import { EmptyState } from "@/shared/data-display/empty-state";
import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { formatPercent } from "@/shared/lib/format";

// ─── Metric toggle ────────────────────────────────────────────────────────────
type MetricKey = "cv" | "rCviqr" | "rCvmad";

const METRIC_LABELS: Record<MetricKey, string> = {
  cv: "CV clásico",
  rCviqr: "rCViqr",
  rCvmad: "rCVmad",
};

// ─── Semáforo helpers ──────────────────────────────────────────────────────────
function semaphoreClass(val: number | null): string {
  if (val === null) return "border-border/50 bg-muted/30";
  if (val < 0.25) return "border-[var(--color-chart-success-bold)] bg-[color-mix(in_srgb,var(--color-chart-success-bold)_12%,transparent)]";
  if (val < 0.4) return "border-[var(--color-chart-warning)] bg-[color-mix(in_srgb,var(--color-chart-warning)_12%,transparent)]";
  return "border-[var(--color-chart-danger)] bg-[color-mix(in_srgb,var(--color-chart-danger)_12%,transparent)]";
}

function semaphoreTextClass(val: number | null): string {
  if (val === null) return "text-muted-foreground";
  if (val < 0.25) return "text-[var(--color-chart-success-bold)]";
  if (val < 0.4) return "text-[var(--color-chart-warning)]";
  return "text-[var(--color-chart-danger)]";
}

function getMetricVal(row: AlturasDronStatsRow, key: MetricKey): number | null {
  return row[key] ?? null;
}

function fmtPct(val: number | null): string {
  return formatPercent(val, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  stats: AlturasDronStatsRow[];
  onCellClick?: (cycleKey: string, eventDate: string) => void;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export function AlturasDronCvHeatmap({ stats, onCellClick }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("cv");

  // For each cycleKey pick the most recent row
  const cycleCards = useMemo(() => {
    const map = new Map<string, AlturasDronStatsRow>();
    for (const row of stats) {
      const existing = map.get(row.cycleKey);
      if (!existing || row.eventDate > existing.eventDate) {
        map.set(row.cycleKey, row);
      }
    }
    // Sort DESC by active metric (worst first / highest CV first)
    const cards = [...map.values()];
    cards.sort((a, b) => {
      const va = getMetricVal(a, activeMetric) ?? -Infinity;
      const vb = getMetricVal(b, activeMetric) ?? -Infinity;
      return vb - va;
    });
    return cards;
  }, [stats, activeMetric]);

  // Max value across all cards for bar magnitude
  const maxMetricVal = useMemo(() => {
    let max = 0;
    for (const row of cycleCards) {
      const v = getMetricVal(row, activeMetric) ?? 0;
      if (v > max) max = v;
    }
    return max;
  }, [cycleCards, activeMetric]);

  if (stats.length === 0) {
    return (
      <ChartSection>
        <ChartSurface title="Heterogeneidad por ciclo (último día medido)">
          <EmptyState label="Sin datos para construir la vista de heterogeneidad." />
        </ChartSurface>
      </ChartSection>
    );
  }

  const otherMetrics = (["cv", "rCviqr", "rCvmad"] as MetricKey[]).filter(
    (m) => m !== activeMetric,
  );

  return (
    <ChartSection>
      <ChartSurface title="Heterogeneidad por ciclo (último día medido)">
        {/* ── Metric toggle ── */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["cv", "rCviqr", "rCvmad"] as MetricKey[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setActiveMetric(m)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeMetric === m
                  ? "bg-foreground text-background"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {METRIC_LABELS[m]}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {cycleCards.length} ciclo{cycleCards.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Card grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {cycleCards.map((row) => {
            const activeVal = getMetricVal(row, activeMetric);
            const barPct =
              maxMetricVal > 0 && activeVal != null
                ? Math.round((activeVal / maxMetricVal) * 100)
                : 0;

            return (
              <button
                key={row.cycleKey}
                type="button"
                onClick={
                  onCellClick
                    ? () => onCellClick(row.cycleKey, row.eventDate)
                    : undefined
                }
                disabled={!onCellClick}
                className={`group flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left transition-all ${semaphoreClass(activeVal)} ${
                  onCellClick
                    ? "cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    : "cursor-default"
                }`}
              >
                {/* cycleKey */}
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                  {row.cycleKey}
                </span>

                {/* variety + spType */}
                <span className="truncate text-[11px] text-foreground/70">
                  {[row.variety, row.spType].filter(Boolean).join(" · ") || "—"}
                </span>

                {/* Active metric big */}
                <span
                  className={`text-xl font-bold tabular-nums leading-none ${semaphoreTextClass(activeVal)}`}
                >
                  {fmtPct(activeVal)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {METRIC_LABELS[activeMetric]}
                </span>

                {/* Magnitude bar */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-border/50">
                  <div
                    className="h-full rounded-full bg-current transition-all"
                    style={{
                      width: `${barPct}%`,
                      color:
                        activeVal == null
                          ? "var(--border)"
                          : activeVal < 0.25
                            ? "var(--color-chart-success-bold)"
                            : activeVal < 0.4
                              ? "var(--color-chart-warning)"
                              : "var(--color-chart-danger)",
                    }}
                    aria-hidden
                  />
                </div>

                {/* Other 2 metrics as plain text */}
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  {otherMetrics.map((m) => (
                    <span key={m}>
                      {METRIC_LABELS[m]}:{" "}
                      <span className="tabular-nums text-foreground/70">
                        {fmtPct(getMetricVal(row, m))}
                      </span>
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </ChartSurface>
    </ChartSection>
  );
}
