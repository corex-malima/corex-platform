"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { LoaderCircle, RefreshCcw, Scale } from "lucide-react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { fetchJson } from "@/lib/fetch-json";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { FilterPanel } from "@/shared/layout/filter-panel";
import { MultiSelectField } from "@/shared/filters/multi-select-field";
import { DateField } from "@/shared/filters/date-field";
import { EmptyState } from "@/shared/data-display/empty-state";
import type { BalanzasDashboardData, BalanzasFilters, BalanzasNodeSummary } from "@/lib/postcosecha-balanzas";
import {
  BalanzasMetricSelector,
  BALANZAS_METRIC_DEFAULT,
  type BalanzasMetricMode,
} from "@/modules/postcosecha/components/balanzas-metric-selector";
import { BalanzasNodeDetailDialog } from "@/modules/postcosecha/components/balanzas-node-detail-dialog";

const BalanzasProcessViewer = dynamic(
  () =>
    import("@/modules/postcosecha/components/balanzas-process-viewer").then(
      (mod) => mod.BalanzasProcessViewer,
    ),
  { ssr: false },
);

type BalanzasExplorerProps = {
  initialData: BalanzasDashboardData;
  initialError?: string | null;
};

/**
 * Filtra los nodos visibles en el BPMN según el modo de métrica activo.
 *
 * - `weight`: solo nodos con sufijo `-weight` (peso simple)
 * - `stems`: solo nodos con sufijo `-stems` (tallos simples)
 * - **Nodos especiales** (terminados en `-ideal`, `-ideal-grade`,
 *   `-b2-b3-weight`, `-b2-b2a-weight`) se muestran SIEMPRE — son métricas
 *   de aprovechamiento/general, no opciones de Tallos vs Peso.
 */
function isSpecialMetricNode(key: string): boolean {
  return (
    key.endsWith("-ideal") ||
    key.endsWith("-ideal-grade") ||
    key.endsWith("-b2-b3-weight") ||
    key.endsWith("-b2-b2a-weight")
  );
}

function nodeMatchesMetricMode(key: string, mode: BalanzasMetricMode): boolean {
  if (isSpecialMetricNode(key)) return true;
  if (mode === "stems") return key.endsWith("-stems");
  return key.endsWith("-weight");
}

function toProcessNodes(nodes: BalanzasNodeSummary[], mode: BalanzasMetricMode) {
  return nodes
    .filter((n) => n.bpmnElementId !== null && nodeMatchesMetricMode(n.key, mode))
    .map((n) => ({
      key: n.key,
      label: n.label,
      overlayOffsetLeft: n.overlayOffsetLeft,
      metrics: n.metrics.map((m) => ({ label: m.label, formatted: m.formatted })),
      status: (n.rowCount > 0 ? "ready" : "unavailable") as "ready" | "unavailable",
      processBindings: [{ elementId: n.bpmnElementId! }],
      destinationBreakdown: [],
    }));
}

function buildQueryString(filters: BalanzasFilters) {
  const params = new URLSearchParams();
  params.set("weekValue", filters.weekValue);
  params.set("month", filters.month);
  params.set("year", filters.year);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  return params.toString();
}

const balanzasFetcher = (url: string) =>
  fetchJson<BalanzasDashboardData>(url, "No se pudo cargar Indicadores Balanzas.");

export function BalanzasExplorer({ initialData, initialError }: BalanzasExplorerProps) {
  const [filters, setFilters] = useState<BalanzasFilters>(initialData.filters);
  const [selectedNode, setSelectedNode] = useState<BalanzasNodeSummary | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  /**
   * Modo de métrica visible: Tallos vs Peso. NO se resetea con `Restablecer`.
   * Los nodos especiales (`-ideal`, `-ideal-grade`, `-b2-b3-weight`,
   * `-b2-b2a-weight`) se muestran siempre, independiente del modo.
   */
  const [metricMode, setMetricMode] = useState<BalanzasMetricMode>(BALANZAS_METRIC_DEFAULT);

  const deferredFilters = useDeferredValue(filters);
  const initialFilterKey = useMemo(() => buildQueryString(initialData.filters), [initialData.filters]);
  const filterKey = useMemo(() => buildQueryString(deferredFilters), [deferredFilters]);

  const { data: dashboardData, error, isValidating, mutate } = useSWR(
    `/api/postcosecha/balanzas?${filterKey}`,
    balanzasFetcher,
    {
      fallbackData: filterKey === initialFilterKey ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 15000,
    },
  );

  const data = dashboardData ?? initialData;

  useMemo(() => {
    if (error) toast.error(error.message || "Error al cargar datos de balanzas");
  }, [error]);

  const nodeMap = useMemo(() => new Map(data.nodes.map((n) => [n.key, n])), [data.nodes]);
  const processNodes = useMemo(() => toProcessNodes(data.nodes, metricMode), [data.nodes, metricMode]);

  function update<K extends keyof BalanzasFilters>(key: K, value: BalanzasFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters(initialData.filters);
  }

  function handleSelectNode(nodeKey: string) {
    const node = nodeMap.get(nodeKey);
    if (node) {
      setSelectedNode(node);
      setDetailOpen(true);
    }
  }

  const weekOptionValues = data.options.weeks.map((o) => o.value);
  const monthOptionValues = data.options.months.map((o) => o.value);
  const yearOptionValues = data.options.years.map((o) => o.value);

  const weekLabelMap = new Map(data.options.weeks.map((o) => [o.value, o.label]));
  const monthLabelMap = new Map(data.options.months.map((o) => [o.value, o.label]));
  const weekDisplayValue = (v: string) => weekLabelMap.get(v) ?? v;
  const monthDisplayValue = (v: string) => monthLabelMap.get(v) ?? v;

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Indicadores / Producción / Postcosecha"
        title="Indicadores Balanzas"
        subtitle="Monitoreo de puntos de control en el flujo de producción. Haz clic en cualquier nodo para ver el detalle completo."
        icon={<Scale className="size-5" aria-hidden="true" />}
        actions={<BalanzasMetricSelector value={metricMode} onChange={setMetricMode} />}
      >
        <FilterPanel>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <MultiSelectField
              id="balanzas-week"
              label="Semana"
              value={filters.weekValue}
              options={weekOptionValues}
              onChange={(v) => update("weekValue", v)}
              displayValue={weekDisplayValue}
              emptyLabel="Todas las semanas"
            />
            <MultiSelectField
              id="balanzas-month"
              label="Mes"
              value={filters.month}
              options={monthOptionValues}
              onChange={(v) => update("month", v)}
              displayValue={monthDisplayValue}
              emptyLabel="Todos los meses"
            />
            <MultiSelectField
              id="balanzas-year"
              label="Año"
              value={filters.year}
              options={yearOptionValues}
              onChange={(v) => update("year", v)}
              emptyLabel="Todos los años"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_200px]">
            <DateField
              id="balanzas-from"
              label="Fecha desde"
              value={filters.dateFrom}
              onChange={(v) => update("dateFrom", v)}
            />
            <DateField
              id="balanzas-to"
              label="Fecha hasta"
              value={filters.dateTo}
              onChange={(v) => update("dateTo", v)}
            />
            <div className="flex items-end">
              <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>

          {isValidating ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Actualizando indicadores de balanzas…
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              Error al cargar datos.{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:opacity-80"
                onClick={() => mutate()}
              >
                Reintentar
              </button>
            </div>
          ) : null}

          {initialError && !error ? (
            <p className="text-sm text-muted-foreground">{initialError}</p>
          ) : null}
        </FilterPanel>
      </SectionPageShell>

      {data.nodes.length === 0 ? (
        <EmptyState label="No hay datos de balanzas para el período seleccionado." />
      ) : (
        <BalanzasProcessViewer
          assetPath="/processes/postcosecha-es.bpmn"
          nodes={processNodes}
          selectedNodeKey={selectedNode?.key ?? null}
          onNodeSelect={handleSelectNode}
        />
      )}

      {selectedNode ? (
        <BalanzasNodeDetailDialog
          node={selectedNode}
          filters={filters}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
        />
      ) : null}
    </div>
  );
}
