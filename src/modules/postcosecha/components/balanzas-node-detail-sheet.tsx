"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/shared/ui/button";
import { KpiGrid } from "@/shared/layout/filter-panel";
import { FilterPanel } from "@/shared/layout/filter-panel";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { SheetShell } from "@/shared/overlays/sheet-shell";
import { MultiSelectField } from "@/shared/filters/multi-select-field";
import { fetchJson } from "@/lib/fetch-json";
import { encodeMultiSelectValue } from "@/lib/multi-select";
import { cn } from "@/lib/utils";
import type { BalanzasFilters, BalanzasNodeDetail, BalanzasNodeSummary } from "@/lib/postcosecha-balanzas";

type Props = {
  node: BalanzasNodeSummary;
  filters: BalanzasFilters;
  open: boolean;
  onClose: () => void;
};

type LocalFilters = {
  destinations: string;
  grades: string;
  gradeGroups: string;
};

const EMPTY_LOCAL: LocalFilters = { destinations: "all", grades: "all", gradeGroups: "all" };

function buildDetailUrl(nodeKey: string, filters: BalanzasFilters, local: LocalFilters) {
  const p = new URLSearchParams();
  p.set("weekValue", filters.weekValue);
  p.set("month", filters.month);
  p.set("year", filters.year);
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) p.set("dateTo", filters.dateTo);
  p.set("destinations", local.destinations);
  p.set("grades", local.grades);
  p.set("gradeGroups", local.gradeGroups);
  return `/api/postcosecha/balanzas/${nodeKey}?${p.toString()}`;
}

function downloadCsv(detail: BalanzasNodeDetail) {
  const header = detail.columns.map((c) => c.label).join(",");
  const rows = detail.rows.map((row) =>
    detail.columns
      .map((c) => {
        const v = row[c.key];
        if (v === null || v === undefined) return "";
        const s = String(v);
        return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(","),
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `balanzas-${detail.nodeKey}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function BalanzasNodeDetailSheet({ node, filters, open, onClose }: Props) {
  const [local, setLocal] = useState<LocalFilters>(EMPTY_LOCAL);

  useEffect(() => {
    if (!open) setLocal(EMPTY_LOCAL);
  }, [open, node.key]);

  const url = open ? buildDetailUrl(node.key, filters, local) : null;

  const { data: detail, isLoading } = useSWR(
    url,
    (u: string) => fetchJson<BalanzasNodeDetail>(u, "No se pudo cargar el detalle."),
    { keepPreviousData: true, revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  const metricCount = Math.min(detail?.metrics.length ?? node.metrics.length, 4) as 2 | 3 | 4;

  const hasDestination = detail ? detail.destinations.length > 0 : false;
  const hasGrades = detail ? detail.grades.length > 0 : false;
  const hasGradeGroups = detail ? detail.gradeGroups.length > 0 : false;
  const hasLocalFilters = hasDestination || hasGrades || hasGradeGroups;

  const destinationOptions = detail?.destinations ?? [];
  const gradeOptions = detail?.grades ?? [];
  const gradeGroupOptions = detail?.gradeGroups ?? [];

  const displayedMetrics = (detail?.metrics ?? node.metrics).slice(0, 4);

  return (
    <SheetShell
      open={open}
      title={node.label}
      description={`${node.branch.toUpperCase()} · ${detail ? detail.rowCount.toLocaleString("es-EC") : "…"} registros`}
      widthClassName="max-w-5xl"
      onClose={onClose}
      headerActions={
        detail ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => downloadCsv(detail)}
          >
            <Download className="size-4" aria-hidden="true" />
            CSV
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <KpiGrid columns={metricCount}>
          {displayedMetrics.map((m) => (
            <MetricTile key={m.col} label={m.label} value={m.formatted} />
          ))}
        </KpiGrid>

        {hasLocalFilters ? (
          <FilterPanel>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {hasDestination ? (
                <MultiSelectField
                  id="detail-destinations"
                  label="Destino"
                  value={local.destinations}
                  options={destinationOptions}
                  onChange={(v) => setLocal((prev) => ({ ...prev, destinations: v }))}
                  emptyLabel="Todos los destinos"
                />
              ) : null}
              {hasGrades ? (
                <MultiSelectField
                  id="detail-grades"
                  label="Grado"
                  value={local.grades}
                  options={gradeOptions}
                  onChange={(v) => setLocal((prev) => ({ ...prev, grades: v }))}
                  emptyLabel="Todos los grados"
                />
              ) : null}
              {hasGradeGroups ? (
                <MultiSelectField
                  id="detail-grade-groups"
                  label="Grupo de grado"
                  value={local.gradeGroups}
                  options={gradeGroupOptions}
                  onChange={(v) => setLocal((prev) => ({ ...prev, gradeGroups: v }))}
                  emptyLabel="Todos los grupos"
                />
              ) : null}
            </div>
          </FilterPanel>
        ) : null}

        {isLoading && !detail ? (
          <div className="flex items-center gap-3 py-12 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Cargando detalle…
          </div>
        ) : detail && detail.columns.length > 0 ? (
          <div className="overflow-auto rounded-[24px] border border-border/70" style={{ maxHeight: "min(55dvh, 600px)" }}>
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr>
                  {detail.columns.map((col) => (
                    <th
                      key={col.key}
                      className="border-b border-r border-border/70 bg-card/95 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.10em] text-muted-foreground whitespace-nowrap last:border-r-0"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.rows.length > 0 ? (
                  detail.rows.map((row, i) => (
                    <tr
                      key={i}
                      className={cn(
                        i % 2 === 0 ? "bg-background/84" : "bg-background/70",
                      )}
                    >
                      {detail.columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn(
                            "border-b border-r border-border/40 px-3 py-2.5 whitespace-nowrap last:border-r-0",
                            col.numeric ? "text-right tabular-nums" : "text-left",
                          )}
                        >
                          {formatCell(row[col.key])}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={detail.columns.length}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No hay filas para los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : detail && detail.columns.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No hay datos disponibles para este nodo en el período seleccionado.
          </p>
        ) : null}
      </div>
    </SheetShell>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("es-EC", { maximumFractionDigits: 4 }) : String(value);
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
  return s;
}

export { encodeMultiSelectValue };
