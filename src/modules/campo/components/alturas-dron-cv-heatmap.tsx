"use client";

import { useMemo, useState } from "react";

import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";
import { EmptyState } from "@/shared/data-display/empty-state";
import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { formatDateSlash, formatPercent } from "@/shared/lib/format";

// ─── Constantes de paginación ─────────────────────────────────────────────────
const PAGE_BLOCKS = 30;
const PAGE_DATES = 20;

// ─── Helpers de color ─────────────────────────────────────────────────────────
function cvCellBg(cv: number | null): string {
  if (cv === null) return "var(--color-muted, #e5e7eb)";
  if (cv < 0.25) return "var(--color-chart-success-bold, #22c55e)";
  if (cv < 0.4) return "var(--color-chart-warning, #f59e0b)";
  return "var(--color-chart-danger, #ef4444)";
}

function cvCellTextColor(cv: number | null): string {
  if (cv === null) return "var(--muted-foreground, #6b7280)";
  // light text on saturated bg; keep it simple: always dark for yellow, white for green/red
  if (cv < 0.25) return "#fff";
  if (cv < 0.4) return "#1f2937";
  return "#fff";
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  stats: AlturasDronStatsRow[];
  onCellClick?: (parentBlock: string, eventDate: string) => void;
};

// ─── Componente ───────────────────────────────────────────────────────────────
export function AlturasDronCvHeatmap({ stats, onCellClick }: Props) {
  const [blockPage, setBlockPage] = useState(0);
  const [datePage, setDatePage] = useState(0);

  // Bloques únicos ordenados
  const allBlocks = useMemo(() => {
    const set = new Set<string>();
    for (const row of stats) set.add(row.parentBlock);
    return [...set].sort((a, b) => a.localeCompare(b, "es-EC", { sensitivity: "base" }));
  }, [stats]);

  // Fechas únicas ordenadas ASC
  const allDates = useMemo(() => {
    const set = new Set<string>();
    for (const row of stats) set.add(row.eventDate);
    return [...set].sort();
  }, [stats]);

  // Paginación de bloques y fechas
  const visibleBlocks = allBlocks.slice(blockPage * PAGE_BLOCKS, (blockPage + 1) * PAGE_BLOCKS);
  const visibleDates = allDates.slice(datePage * PAGE_DATES, (datePage + 1) * PAGE_DATES);

  const totalBlockPages = Math.ceil(allBlocks.length / PAGE_BLOCKS);
  const totalDatePages = Math.ceil(allDates.length / PAGE_DATES);

  // Lookup map: "parentBlock|eventDate" → cv
  const cvMap = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const row of stats) {
      map.set(`${row.parentBlock}|${row.eventDate}`, row.cv ?? null);
    }
    return map;
  }, [stats]);

  if (stats.length === 0) {
    return (
      <ChartSection>
        <ChartSurface title="Mapa de heterogeneidad (CV) por bloque y fecha">
          <EmptyState label="Sin datos para construir el heatmap." />
        </ChartSurface>
      </ChartSection>
    );
  }

  return (
    <ChartSection>
      <ChartSurface title="Mapa de heterogeneidad (CV) por bloque y fecha">
        {/* Leyenda */}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <LegendDot color="var(--color-chart-success-bold, #22c55e)" label="CV < 25 %" />
          <LegendDot color="var(--color-chart-warning, #f59e0b)" label="25 % ≤ CV < 40 %" />
          <LegendDot color="var(--color-chart-danger, #ef4444)" label="CV ≥ 40 %" />
          <LegendDot color="var(--color-muted, #e5e7eb)" label="Sin dato" textColor="#6b7280" />
        </div>

        {/* Tabla heatmap con scroll horizontal */}
        <div className="overflow-x-auto show-scrollbar rounded-[12px] border border-border/60">
          <table className="border-collapse text-xs" aria-label="Heatmap CV por bloque y fecha">
            <thead>
              <tr>
                {/* Celda vacía esquina */}
                <th
                  className="sticky left-0 z-10 min-w-[110px] border-b border-r border-border/60 bg-card px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground"
                  scope="col"
                >
                  Bloque
                </th>
                {visibleDates.map((date) => (
                  <th
                    key={date}
                    scope="col"
                    className="border-b border-r border-border/60 bg-card px-1 py-2 text-center"
                    style={{ minWidth: 42 }}
                  >
                    <span
                      className="inline-block text-[10px] font-medium text-muted-foreground"
                      style={{
                        writingMode: "vertical-rl",
                        textOrientation: "mixed",
                        transform: "rotate(180deg)",
                        lineHeight: 1.2,
                        whiteSpace: "nowrap",
                        maxHeight: 90,
                      }}
                    >
                      {formatDateSlash(date)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleBlocks.map((block) => (
                <tr key={block} className="group">
                  <td className="sticky left-0 z-10 border-b border-r border-border/60 bg-card px-3 py-1.5 font-medium text-foreground group-hover:bg-muted/30">
                    {block}
                  </td>
                  {visibleDates.map((date) => {
                    const cv = cvMap.get(`${block}|${date}`) ?? null;
                    const bg = cvCellBg(cv);
                    const textColor = cvCellTextColor(cv);
                    const label =
                      cv !== null
                        ? `Bloque ${block}, ${formatDateSlash(date)}, CV = ${formatPercent(cv, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 1 })}`
                        : `Bloque ${block}, ${formatDateSlash(date)}: sin dato`;

                    return (
                      <td
                        key={date}
                        title={label}
                        aria-label={label}
                        className="border-b border-r border-border/20 p-0.5"
                        onClick={
                          onCellClick
                            ? () => onCellClick(block, date)
                            : undefined
                        }
                        style={{
                          cursor: onCellClick ? "pointer" : "default",
                        }}
                      >
                        <div
                          className="flex h-8 w-9 items-center justify-center rounded-[4px] text-[10px] font-medium transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: bg,
                            color: textColor,
                          }}
                        >
                          {cv !== null
                            ? formatPercent(cv, {
                                input: "ratio",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              })
                            : ""}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Controles de paginación */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          {/* Paginación de bloques */}
          {totalBlockPages > 1 && (
            <div className="flex items-center gap-2">
              <span>Bloques:</span>
              <PaginationControls
                page={blockPage}
                totalPages={totalBlockPages}
                onPrev={() => setBlockPage((p) => Math.max(0, p - 1))}
                onNext={() => setBlockPage((p) => Math.min(totalBlockPages - 1, p + 1))}
                label={`${blockPage * PAGE_BLOCKS + 1}–${Math.min((blockPage + 1) * PAGE_BLOCKS, allBlocks.length)} de ${allBlocks.length}`}
              />
            </div>
          )}

          {/* Paginación de fechas */}
          {totalDatePages > 1 && (
            <div className="flex items-center gap-2">
              <span>Fechas:</span>
              <PaginationControls
                page={datePage}
                totalPages={totalDatePages}
                onPrev={() => setDatePage((p) => Math.max(0, p - 1))}
                onNext={() => setDatePage((p) => Math.min(totalDatePages - 1, p + 1))}
                label={`${datePage * PAGE_DATES + 1}–${Math.min((datePage + 1) * PAGE_DATES, allDates.length)} de ${allDates.length}`}
              />
            </div>
          )}

          {totalBlockPages <= 1 && totalDatePages <= 1 && (
            <span>
              {allBlocks.length} bloques · {allDates.length} fechas
            </span>
          )}
        </div>
      </ChartSurface>
    </ChartSection>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────
function LegendDot({
  color,
  label,
  textColor = "#fff",
}: {
  color: string;
  label: string;
  textColor?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="inline-block size-3.5 flex-shrink-0 rounded-sm border border-black/10"
        style={{ backgroundColor: color, color: textColor }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function PaginationControls({
  page,
  totalPages,
  onPrev,
  onNext,
  label,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={page === 0}
        aria-label="Página anterior"
        className="rounded px-1.5 py-0.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>
      <span className="tabular-nums">{label}</span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        aria-label="Página siguiente"
        className="rounded px-1.5 py-0.5 transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </span>
  );
}
