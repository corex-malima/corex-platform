"use client";

import { useState, type ReactNode } from "react";
import { Download, LoaderCircle } from "lucide-react";
import useSWR from "swr";

import type { BalanzasFilters, BalanzasNodeDetail, BalanzasNodeKpi, BalanzasNodeSummary } from "@/lib/postcosecha-balanzas";
import { fetchJson } from "@/lib/fetch-json";
import { BalanzasExpandableTable, type BalanzasGroupBy } from "@/modules/postcosecha/components/balanzas-expandable-table";
import { BalanzasFlatTable } from "@/modules/postcosecha/components/balanzas-flat-table";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { MultiSelectField } from "@/shared/filters/multi-select-field";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import {
  ajusteAccent,
  cumplimientoAccent,
  cumplimientoAccentInverso,
} from "@/shared/lib/cumplimiento";
import { formatDecimal, formatPercent } from "@/shared/lib/format";
import { DialogShell } from "@/shared/overlays/dialog-shell";
import { Button } from "@/shared/ui/button";

type Props = {
  node: BalanzasNodeSummary;
  filters: BalanzasFilters;
  open: boolean;
  presetDestination?: string | null;
  onClose: () => void;
};

type LocalFilters = {
  destinations: string;
  grades: string;
  gradeGroups: string;
  detailYears: string;
  detailMonths: string;
  detailWeeks: string;
  detailDates: string;
};

const EMPTY_LOCAL: LocalFilters = {
  destinations: "all",
  grades: "all",
  gradeGroups: "all",
  detailYears: "all",
  detailMonths: "all",
  detailWeeks: "all",
  detailDates: "all",
};

const TEMPORAL_FILTER_NODE_KEYS = new Set([
  "gv-b1-b1c-weight",
  "apertura-b1-b1c-weight",
  "gv-b1c-b2-weight",
  "apertura-b1c-b2-weight",
  "gv-b2-b2a-weight",
  "apertura-b2-b2a-weight",
  "gv-b1c-b2a-ideal",
  "apertura-b1c-b2a-ideal",
]);

function buildEmptyLocalFilters(presetDestination?: string | null): LocalFilters {
  return {
    ...EMPTY_LOCAL,
    destinations: presetDestination ?? "all",
  };
}

function formatDestinationLabel(raw: string): string {
  if (!raw) return raw;

  const upper = raw.trim().toUpperCase();
  if (upper === "ARCOIRIS" || upper === "ARCOÍRIS") return "Arcoíris";
  if (upper === "BLANCO") return "Blanco";
  if (upper === "TINTURADO") return "Tinturado";

  const lower = raw.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function buildDetailUrl(nodeKey: string, filters: BalanzasFilters, local: LocalFilters) {
  const params = new URLSearchParams();
  params.set("weekValue", filters.weekValue);
  params.set("month", filters.month);
  params.set("year", filters.year);

  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (filters.farm && filters.farm !== "xl") params.set("farm", filters.farm);

  params.set("destinations", local.destinations);
  params.set("grades", local.grades);
  params.set("gradeGroups", local.gradeGroups);
  params.set("detailYears", local.detailYears);
  params.set("detailMonths", local.detailMonths);
  params.set("detailWeeks", local.detailWeeks);
  params.set("detailDates", local.detailDates);

  return `/api/postcosecha/balanzas/${nodeKey}?${params.toString()}`;
}

function downloadCsv(detail: BalanzasNodeDetail) {
  const header = detail.columns.map((column) => column.label).join(",");
  const rows = detail.rows.map((row) =>
    detail.columns
      .map((column) => {
        const value = row[column.key];
        if (value === null || value === undefined) return "";
        const stringValue = String(value);
        return stringValue.includes(",") || stringValue.includes('"')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue;
      })
      .join(","),
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `balanzas-${detail.nodeKey}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function BalanzasNodeDetailDialog({ node, filters, open, presetDestination, onClose }: Props) {
  const [local, setLocal] = useState<LocalFilters>(() => buildEmptyLocalFilters(presetDestination));
  const groupBy: BalanzasGroupBy = null;

  const url = open ? buildDetailUrl(node.key, filters, local) : null;

  const { data: detail, isLoading } = useSWR(
    url,
    (requestUrl: string) => fetchJson<BalanzasNodeDetail>(requestUrl, "No se pudo cargar el detalle."),
    { keepPreviousData: true, revalidateOnFocus: false, dedupingInterval: 10000 },
  );

  const displayedMetrics = detail?.metrics ?? node.metrics;
  const metricCount = (
    displayedMetrics.length <= 2 ? 2
      : displayedMetrics.length === 3 ? 3
        : displayedMetrics.length === 4 ? 4
          : 5
  ) as 2 | 3 | 4 | 5;

  const hasDestination = detail ? detail.destinations.length > 0 : false;
  const hasGrades = detail ? detail.grades.length > 0 : false;
  const hasGradeGroups = detail ? detail.gradeGroups.length > 0 : false;
  const isFlatTable = (detail?.tableMode ?? node.detailTableMode) === "flat";

  const destinationOptions = detail?.destinations ?? [];
  const gradeOptions = detail?.grades ?? [];
  const gradeGroupOptions = detail?.gradeGroups ?? [];
  const temporalOptions = detail && TEMPORAL_FILTER_NODE_KEYS.has(detail.nodeKey) ? detail.temporalOptions : undefined;
  const yearOptions = temporalOptions?.years.map((option) => option.value) ?? [];
  const monthOptions = temporalOptions?.months.map((option) => option.value) ?? [];
  const weekOptions = temporalOptions?.weeks.map((option) => option.value) ?? [];
  const dateOptions = temporalOptions?.dates.map((option) => option.value) ?? [];
  const monthLabelMap = new Map((temporalOptions?.months ?? []).map((option) => [option.value, option.label]));

  return (
    <DialogShell
      open={open}
      title={
        presetDestination
          ? `${node.dialogTitle ?? node.label} · ${formatDestinationLabel(presetDestination)}`
          : (node.dialogTitle ?? node.label)
      }
      description={`${detail ? detail.rowCount.toLocaleString("es-EC") : "..."} registros`}
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
          {displayedMetrics.map((metric) => (
            <MetricTile key={metric.col} label={metric.label} value={metric.formatted} />
          ))}
        </KpiGrid>

        {detail?.kpi ? <KpiMetaSection kpi={detail.kpi} /> : null}

        <FilterPanel>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {hasDestination ? (
              <MultiSelectField
                id="detail-destinations"
                label="Destino"
                value={local.destinations}
                options={destinationOptions}
                displayValue={formatDestinationLabel}
                onChange={(value) => setLocal((prev) => ({ ...prev, destinations: value }))}
                emptyLabel="Todos los destinos"
              />
            ) : null}
            {hasGrades ? (
              <MultiSelectField
                id="detail-grades"
                label="Grado"
                value={local.grades}
                options={gradeOptions}
                onChange={(value) => setLocal((prev) => ({ ...prev, grades: value }))}
                emptyLabel="Todos los grados"
              />
            ) : null}
            {hasGradeGroups ? (
              <MultiSelectField
                id="detail-grade-groups"
                label="Grupo de grado"
                value={local.gradeGroups}
                options={gradeGroupOptions}
                onChange={(value) => setLocal((prev) => ({ ...prev, gradeGroups: value }))}
                emptyLabel="Todos los grupos"
              />
            ) : null}
          </div>

          {temporalOptions ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MultiSelectField
                id="detail-years"
                label="Año"
                value={local.detailYears}
                options={yearOptions}
                onChange={(value) => setLocal((prev) => ({ ...prev, detailYears: value }))}
                emptyLabel="Todos los años"
              />
              <MultiSelectField
                id="detail-months"
                label="Mes"
                value={local.detailMonths}
                options={monthOptions}
                displayValue={(value) => monthLabelMap.get(value) ?? value}
                onChange={(value) => setLocal((prev) => ({ ...prev, detailMonths: value }))}
                emptyLabel="Todos los meses"
              />
              <MultiSelectField
                id="detail-weeks"
                label="Semana"
                value={local.detailWeeks}
                options={weekOptions}
                onChange={(value) => setLocal((prev) => ({ ...prev, detailWeeks: value }))}
                emptyLabel="Todas las semanas"
              />
              <MultiSelectField
                id="detail-dates"
                label={temporalOptions.dateLabel}
                value={local.detailDates}
                options={dateOptions}
                onChange={(value) => setLocal((prev) => ({ ...prev, detailDates: value }))}
                emptyLabel="Todas las fechas"
              />
            </div>
          ) : null}
        </FilterPanel>

        {isLoading && !detail ? (
          <div className="flex items-center gap-3 py-12 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            Cargando detalle…
          </div>
        ) : detail && detail.columns.length > 0 ? (
          isFlatTable ? (
            <BalanzasFlatTable detail={detail} />
          ) : (
            <BalanzasExpandableTable detail={detail} groupBy={groupBy} />
          )
        ) : detail && detail.columns.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No hay datos disponibles para este nodo en el período seleccionado.
          </p>
        ) : null}
      </div>
    </DialogShell>
  );
}

/**
 * Sección "Indicadores con meta" del modal de nodo Balanzas.
 *
 * Renderiza 3 sub-bloques opcionales (Hidratación / Desperdicio / Ajuste)
 * según qué KPIs vinieron en `detail.kpi`. Cada KPI muestra 3 tiles:
 * Real / Meta / Cumplimiento, con accent semáforo de `@/shared/lib/cumplimiento`.
 *
 * Convenciones:
 * - Hidratación: razón B1C/B2 (mayor es mejor) ≠ columna legacy `hydration_pct`
 *   (que es B2/B1C); por eso el KPI es paralelo a la columna legacy de la tabla.
 * - Desperdicio: real y meta en negativo (convención "menos es mejor");
 *   el cumplimiento = |meta| / |real|, así que >1 sigue significando "sobre meta".
 * - Ajuste: razón / α + β·razón / final censurado [0.98 – 1.02];
 *   accent warning cuando el final toca el borde.
 */
function KpiMetaSection({ kpi }: { kpi: BalanzasNodeKpi }) {
  const { hydration, waste, adjustment } = kpi;
  if (!hydration && !waste && !adjustment) return null;

  return (
    <section className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Indicadores con meta</h3>
        <span className="text-xs text-muted-foreground">Meta canon SCD2 · `db_admin`</span>
      </header>

      {hydration ? (
        <KpiBlock title="Hidratación">
          <MetricTile
            label="Hidratación real"
            value={formatDecimal(hydration.real, 3)}
            hint="Razón SUM(B1C) / SUM(B2). KPI propio (≠ columna legacy HIDR%)."
          />
          <MetricTile
            label="Meta hidratación"
            value={formatDecimal(hydration.meta, 3)}
            hint={
              hydration.rowsMissingMeta > 0
                ? `Ponderada por peso B2. ${hydration.rowsMissingMeta} fila(s) sin meta de grado.`
                : "Ponderada por peso B2."
            }
          />
          <MetricTile
            label="Cumplimiento"
            value={formatPercent(hydration.cumplimiento, { input: "ratio" })}
            hint="real / meta — mayor es mejor"
            accent={cumplimientoAccent(hydration.cumplimiento)}
          />
        </KpiBlock>
      ) : null}

      {waste ? (
        <KpiBlock title="Desperdicio">
          <MetricTile
            label="Desperdicio real"
            value={formatDecimal(waste.real, 3)}
            hint="Razón −SUM(B2A) / SUM(B2). Menor (más negativo) es peor."
          />
          <MetricTile
            label="Meta desperdicio"
            value={formatDecimal(waste.meta, 3)}
            hint={
              waste.rowsMissingMeta > 0
                ? `Ponderada por peso B2. ${waste.rowsMissingMeta} fila(s) sin meta de destino.`
                : "Ponderada por peso B2."
            }
          />
          <MetricTile
            label="Cumplimiento"
            value={formatPercent(waste.cumplimiento, { input: "ratio" })}
            hint="|meta| / |real| — >1 mejor que la meta"
            accent={cumplimientoAccentInverso(waste.cumplimiento)}
          />
        </KpiBlock>
      ) : null}

      {adjustment ? (
        <KpiBlock title="Ajuste">
          <MetricTile
            label="Razón ajuste"
            value={formatDecimal(adjustment.razonAjuste, 4)}
            hint={`α = ${formatDecimal(adjustment.alpha, 2)} · β = ${formatDecimal(adjustment.beta, 2)}`}
          />
          <MetricTile
            label="Ajuste bruto"
            value={formatDecimal(adjustment.ajusteBruto, 4)}
            hint="α + β · razón"
          />
          <MetricTile
            label="Ajuste final"
            value={formatDecimal(adjustment.ajusteFinal, 4)}
            hint={
              adjustment.weeksCovered.length > 0
                ? `Censurado [0.98 – 1.02]. Semanas: ${adjustment.weeksCovered.join(", ")}.`
                : "Censurado [0.98 – 1.02]."
            }
            accent={ajusteAccent(adjustment.ajusteFinal)}
          />
        </KpiBlock>
      ) : null}
    </section>
  );
}

function KpiBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <KpiGrid columns={3}>{children}</KpiGrid>
    </div>
  );
}
