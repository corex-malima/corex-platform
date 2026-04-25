"use client";

import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import useSWR from "swr";

import { BalanzasExpandableTable, type BalanzasGroupBy } from "@/modules/postcosecha/components/balanzas-expandable-table";
import { Button } from "@/shared/ui/button";
import { KpiGrid } from "@/shared/layout/filter-panel";
import { FilterPanel } from "@/shared/layout/filter-panel";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { DialogShell } from "@/shared/overlays/dialog-shell";
import { MultiSelectField } from "@/shared/filters/multi-select-field";
import { SingleSelectField } from "@/shared/filters/single-select-field";
import { fetchJson } from "@/lib/fetch-json";
import { encodeMultiSelectValue } from "@/lib/multi-select";
import type { BalanzasFilters, BalanzasNodeDetail, BalanzasNodeSummary } from "@/lib/postcosecha-balanzas";

type Props = {
  node: BalanzasNodeSummary;
  filters: BalanzasFilters;
  open: boolean;
  /**
   * Cuando se abre desde un overlay split por destino (Arcoíris/Blanco/Tinturado),
   * el dialog pre-aplica el filtro `destination` con este valor uppercase
   * (ej: "ARCOIRIS"). El usuario puede cambiarlo o ampliar manualmente.
   */
  presetDestination?: string | null;
  onClose: () => void;
};

type LocalFilters = {
  destinations: string;
  grades: string;
  gradeGroups: string;
};

const EMPTY_LOCAL: LocalFilters = { destinations: "all", grades: "all", gradeGroups: "all" };

/**
 * Normaliza el casing del valor `destination` proveniente del backend a la
 * forma visible canónica del docx: Arcoíris / Blanco / Tinturado.
 *
 * El value enviado al backend (filtro) se mantiene tal cual — solo cambiamos
 * el label que ve el usuario.
 */
function formatDestinationLabel(raw: string): string {
  if (!raw) return raw;
  const upper = raw.trim().toUpperCase();
  if (upper === "ARCOIRIS" || upper === "ARCOÍRIS") return "Arcoíris";
  if (upper === "BLANCO") return "Blanco";
  if (upper === "TINTURADO") return "Tinturado";
  // Fallback: capitalizar primera letra, resto lowercase
  const lower = raw.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

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

export function BalanzasNodeDetailDialog({ node, filters, open, presetDestination, onClose }: Props) {
  const [local, setLocal] = useState<LocalFilters>(EMPTY_LOCAL);
  const [groupBy, setGroupBy] = useState<BalanzasGroupBy>(null);

  useEffect(() => {
    // Resetea los filtros locales al cerrar para que la próxima apertura empiece limpia.
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocal(EMPTY_LOCAL);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGroupBy(null);
    }
  }, [open, node.key]);

  // Pre-aplica el filtro `destination` cuando el dialog se abre desde un
  // overlay split por destino. Solo se aplica al abrir (al cambiar
  // `presetDestination` o al pasar de cerrado a abierto).
  useEffect(() => {
    if (!open || !presetDestination) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal((prev) => ({ ...prev, destinations: presetDestination }));
  }, [open, presetDestination, node.key]);

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
  const destinationOptions = detail?.destinations ?? [];
  const gradeOptions = detail?.grades ?? [];
  const gradeGroupOptions = detail?.gradeGroups ?? [];

  const displayedMetrics = (detail?.metrics ?? node.metrics).slice(0, 4);

  return (
    <DialogShell
      open={open}
      title={
        presetDestination
          ? `${node.dialogTitle ?? node.label} · ${formatDestinationLabel(presetDestination)}`
          : (node.dialogTitle ?? node.label)
      }
      description={`${detail ? detail.rowCount.toLocaleString("es-EC") : "…"} registros`}
      maxWidth="max-w-7xl"
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

        <FilterPanel>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SingleSelectField
              id="detail-groupBy"
              label="Agrupación"
              value={groupBy ?? "none"}
              options={[
                ...(hasDestination ? ["destination"] : []),
                ...(hasGrades ? ["grade"] : []),
                ...(hasGradeGroups ? ["gradeGroup"] : []),
              ]}
              displayValue={(v) =>
                v === "destination" ? "Por destino"
                  : v === "grade" ? "Por grado"
                    : v === "gradeGroup" ? "Por grupo de grado"
                      : v
              }
              emptyValue="none"
              emptyLabel="Sin agrupar (Semana → detalle)"
              onChange={(v) => setGroupBy(v === "none" ? null : (v as BalanzasGroupBy))}
            />
            {hasDestination ? (
              <MultiSelectField
                id="detail-destinations"
                label="Destino"
                value={local.destinations}
                options={destinationOptions}
                displayValue={formatDestinationLabel}
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

        {isLoading && !detail ? (
          <div className="flex items-center gap-3 py-12 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Cargando detalle…
          </div>
        ) : detail && detail.columns.length > 0 ? (
          <BalanzasExpandableTable detail={detail} groupBy={groupBy} />
        ) : detail && detail.columns.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No hay datos disponibles para este nodo en el período seleccionado.
          </p>
        ) : null}
      </div>
    </DialogShell>
  );
}

export { encodeMultiSelectValue };
