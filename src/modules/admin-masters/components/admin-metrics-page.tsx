"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";
import { PencilLine, Plus, RefreshCcw, Save, Search, Target } from "lucide-react";
import { toast } from "sonner";

import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type GoalMetric = Record<string, string | number | boolean | null>;
type GoalsPayload = { metrics: GoalMetric[]; objectives: GoalMetric[]; targets: GoalMetric[]; dimensions: GoalMetric[] };

const EMPTY_METRIC = {
  metricCode: "",
  metricName: "",
  metricType: "KPI",
  unitOfMeasure: "",
  valueFormat: "number",
  direction: "higher_is_better",
};

const fetcher = (url: string) => fetchJson<GoalsPayload>(url, "No se pudo cargar métricas.");

export function AdminMetricsPage() {
  const { data, mutate, isValidating } = useSWR("/api/admin/administracion-maestros/goals", fetcher, { revalidateOnFocus: false });
  const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_METRIC);
  const deferredSearch = useDeferredValue(search);

  const metrics = useMemo(() => data?.metrics ?? [], [data?.metrics]);
  const selectedMetric = selectedMetricId ? metrics.find((metric) => String(metric.metric_id) === selectedMetricId) ?? null : null;
  const filteredMetrics = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) return metrics;
    return metrics.filter((metric) => [metric.metric_code, metric.metric_name, metric.metric_type, metric.unit_of_measure]
      .some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [deferredSearch, metrics]);

  function openCreateMode() {
    startTransition(() => {
      setSelectedMetricId(null);
      setFormValues(EMPTY_METRIC);
    });
  }

  function openEditMode(metric: GoalMetric) {
    startTransition(() => {
      setSelectedMetricId(String(metric.metric_id));
      setFormValues({
        metricCode: String(metric.metric_code ?? ""),
        metricName: String(metric.metric_name ?? ""),
        metricType: String(metric.metric_type ?? "KPI"),
        unitOfMeasure: String(metric.unit_of_measure ?? ""),
        valueFormat: String(metric.value_format ?? "number"),
        direction: String(metric.direction ?? "higher_is_better"),
      });
    });
  }

  async function saveMetric(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValues.metricCode.trim() || !formValues.metricName.trim()) {
      toast.error("Código y nombre de la métrica son obligatorios.");
      return;
    }
    try {
      await fetchJson("/api/admin/administracion-maestros/goals", "No se pudo guardar la métrica.", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entity: "metric", ...formValues }),
      });
      toast.success("Métrica creada.");
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la métrica.");
    }
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Administración / Administración Maestros"
        title="Métricas"
        subtitle="Catálogo operativo de métricas reutilizables para metas, objetivos y dashboards."
        icon={<Target className="size-5" aria-hidden="true" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void mutate()}>
              <RefreshCcw className={cn("size-4", isValidating && "animate-spin")} />
              Recargar
            </Button>
            <Button type="button" className="rounded-full" onClick={openCreateMode}>
              <Plus className="size-4" />
              Nueva métrica
            </Button>
          </div>
        )}
      >
        <FilterPanel>
          <KpiGrid>
            <MetricTile label="Métricas activas" value={String(metrics.filter((metric) => metric.is_valid).length)} hint="Métricas vigentes para asignar a metas." />
            <MetricTile label="Total métricas" value={String(metrics.length)} hint="Incluye métricas inactivas." />
            <MetricTile label="Seleccionada" value={selectedMetric ? String(selectedMetric.metric_code) : "-"} hint="Métrica abierta en el editor." />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <CardTitle className="text-lg">Listado de métricas</CardTitle>
            <div className="space-y-2">
              <Label htmlFor="metric-search">Buscar métrica</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="metric-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nombre, tipo o unidad..." className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
              {filteredMetrics.length ? filteredMetrics.map((metric) => {
                const isSelected = selectedMetricId === String(metric.metric_id);
                return (
                  <button key={String(metric.metric_id)} type="button" onClick={() => openEditMode(metric)} className={cn("w-full rounded-[24px] border px-5 py-4 text-left transition-colors", isSelected ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "border-border/70 bg-background/80 hover:border-slate-300 hover:bg-background")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{String(metric.metric_name ?? "")}</p>
                          <Badge variant={isSelected ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{String(metric.metric_type ?? "KPI")}</Badge>
                        </div>
                        <p className={cn("text-xs", isSelected ? "text-white/80" : "text-muted-foreground")}>{String(metric.metric_code ?? "")}</p>
                      </div>
                      <PencilLine className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                  </button>
                );
              }) : <div className="rounded-[24px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">No hay métricas que coincidan.</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84 xl:sticky xl:top-4 xl:self-start">
          <CardHeader>
            <CardTitle className="text-lg">{selectedMetric ? String(selectedMetric.metric_code) : "Registrar métrica"}</CardTitle>
            <CardDescription>Define unidad, formato y dirección de lectura de la métrica.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={saveMetric}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2"><Label>Código</Label><Input className="rounded-xl" value={formValues.metricCode} onChange={(event) => setFormValues((current) => ({ ...current, metricCode: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Tipo</Label><Input className="rounded-xl" value={formValues.metricType} onChange={(event) => setFormValues((current) => ({ ...current, metricType: event.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Nombre</Label><Input className="rounded-xl" value={formValues.metricName} onChange={(event) => setFormValues((current) => ({ ...current, metricName: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Unidad</Label><Input className="rounded-xl" value={formValues.unitOfMeasure} onChange={(event) => setFormValues((current) => ({ ...current, unitOfMeasure: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Formato</Label><Input className="rounded-xl" value={formValues.valueFormat} onChange={(event) => setFormValues((current) => ({ ...current, valueFormat: event.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Dirección</Label><Input className="rounded-xl" value={formValues.direction} onChange={(event) => setFormValues((current) => ({ ...current, direction: event.target.value }))} /></div>
              </div>
              <div className="flex justify-end"><Button type="submit" className="rounded-full"><Save className="size-4" /> Guardar métrica</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
