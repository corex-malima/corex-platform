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
import { SingleSelectField } from "@/shared/filters/single-select-field";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type AdminMetric = {
  metricCode: string;
  metricName: string;
  metricDescription: string | null;
  dataTypeCode: string;
  dataTypeLabel: string | null;
  directionCode: string;
  directionLabel: string | null;
  unitCode: string | null;
  unitName: string | null;
  unitSymbol: string | null;
  notesText: string | null;
  validFrom: string;
  validTo: string | null;
  actorId: string | null;
  changeReason: string;
};
type AdminUnit = { unitCode: string; unitName: string; unitSymbol: string | null };
type AdminCatalogItem = { catalogCode: string; itemCode: string; itemLabelEs: string };
type MetricsPayload = { metrics: AdminMetric[]; units: AdminUnit[]; dataTypes: AdminCatalogItem[]; directions: AdminCatalogItem[] };

const ENDPOINT = "/api/admin/administracion-maestros/metricas";
const fetcher = (url: string) => fetchJson<MetricsPayload>(url, "No se pudo cargar métricas.");

const EMPTY_METRIC = {
  metricCode: "",
  metricName: "",
  metricDescription: "",
  dataTypeCode: "",
  directionCode: "",
  unitCode: "",
  notesText: "",
  changeReason: "",
};

export function AdminMetricsPage() {
  const { data, mutate, isValidating } = useSWR(ENDPOINT, fetcher, { revalidateOnFocus: false });
  const [selectedMetricCode, setSelectedMetricCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_METRIC);
  const deferredSearch = useDeferredValue(search);

  const metrics = useMemo(() => data?.metrics ?? [], [data?.metrics]);
  const units = useMemo(() => data?.units ?? [], [data?.units]);
  const dataTypes = useMemo(() => data?.dataTypes ?? [], [data?.dataTypes]);
  const directions = useMemo(() => data?.directions ?? [], [data?.directions]);

  const dataTypeByCode = useMemo(() => new Map(dataTypes.map((d) => [d.itemCode, d.itemLabelEs])), [dataTypes]);
  const directionByCode = useMemo(() => new Map(directions.map((d) => [d.itemCode, d.itemLabelEs])), [directions]);
  const unitByCode = useMemo(() => new Map(units.map((u) => [u.unitCode, u])), [units]);

  const dataTypeOptions = useMemo(() => dataTypes.map((d) => d.itemCode), [dataTypes]);
  const directionOptions = useMemo(() => directions.map((d) => d.itemCode), [directions]);
  const unitOptions = useMemo(() => units.map((u) => u.unitCode), [units]);

  const selectedMetric = selectedMetricCode ? metrics.find((m) => m.metricCode === selectedMetricCode) ?? null : null;
  const isEdit = selectedMetric !== null;

  const filteredMetrics = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) return metrics;
    return metrics.filter((m) => [m.metricCode, m.metricName, m.dataTypeCode, m.directionCode, m.unitCode]
      .some((v) => String(v ?? "").toLowerCase().includes(normalized)));
  }, [deferredSearch, metrics]);

  function openCreateMode() {
    startTransition(() => {
      setSelectedMetricCode(null);
      setFormValues(EMPTY_METRIC);
    });
  }

  function openEditMode(metric: AdminMetric) {
    startTransition(() => {
      setSelectedMetricCode(metric.metricCode);
      setFormValues({
        metricCode: metric.metricCode,
        metricName: metric.metricName,
        metricDescription: metric.metricDescription ?? "",
        dataTypeCode: metric.dataTypeCode,
        directionCode: metric.directionCode,
        unitCode: metric.unitCode ?? "",
        notesText: metric.notesText ?? "",
        changeReason: "",
      });
    });
  }

  async function saveMetric(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValues.metricCode.trim() || !formValues.metricName.trim() || !formValues.dataTypeCode || !formValues.directionCode) {
      toast.error("Código, nombre, tipo de dato y dirección son obligatorios.");
      return;
    }
    const payload = {
      metricCode: formValues.metricCode.trim(),
      metricName: formValues.metricName.trim(),
      metricDescription: formValues.metricDescription.trim() || null,
      dataTypeCode: formValues.dataTypeCode,
      directionCode: formValues.directionCode,
      unitCode: formValues.unitCode || null,
      notesText: formValues.notesText.trim() || null,
      changeReason: formValues.changeReason.trim() || (isEdit ? "manual_update" : "manual_create"),
    };
    try {
      if (isEdit) {
        await fetchJson(ENDPOINT, "No se pudo actualizar.", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", ...payload }),
        });
        toast.success("Métrica actualizada (nueva versión SCD2).");
      } else {
        await fetchJson(ENDPOINT, "No se pudo crear.", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Métrica creada.");
      }
      setSelectedMetricCode(payload.metricCode);
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    }
  }

  async function toggleValidity(metric: AdminMetric) {
    try {
      await fetchJson(ENDPOINT, "No se pudo cambiar la validez.", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-validity", metricCode: metric.metricCode, isValid: false }),
      });
      toast.success("Métrica desactivada.");
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la validez.");
    }
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Administración / Administración Maestros / Métricas"
        title="Métricas"
        subtitle="Maestro de métricas reutilizables para objetivos, metas y tableros."
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
          <KpiGrid columns={4}>
            <MetricTile label="Métricas activas" value={String(metrics.length)} hint="Versión vigente." />
            <MetricTile label="Tipos de dato" value={String(dataTypes.length)} hint="Catálogo metric_data_types." />
            <MetricTile label="Direcciones" value={String(directions.length)} hint="Catálogo metric_directions." />
            <MetricTile label="Unidades" value={String(units.length)} hint="Maestro de unidades." />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-900/20 dark:text-white">
                <Target className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Métricas registradas</CardTitle>
                <CardDescription>Selecciona una métrica para editarla o crea una nueva.</CardDescription>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="metric-search">Buscar métrica</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="metric-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, nombre, tipo, dirección o unidad..." className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
              {filteredMetrics.length ? filteredMetrics.map((metric) => {
                const isSelected = selectedMetricCode === metric.metricCode;
                const dtLabel = metric.dataTypeLabel ?? dataTypeByCode.get(metric.dataTypeCode) ?? metric.dataTypeCode;
                const drLabel = metric.directionLabel ?? directionByCode.get(metric.directionCode) ?? metric.directionCode;
                return (
                  <button key={metric.metricCode} type="button" onClick={() => openEditMode(metric)} className={cn("w-full rounded-[24px] border px-5 py-4 text-left transition-colors", isSelected ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "border-border/70 bg-background/80 hover:border-slate-300 hover:bg-background")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{metric.metricName}</p>
                          {metric.unitSymbol ? <Badge variant={isSelected ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{metric.unitSymbol}</Badge> : null}
                          <Badge variant="outline" className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{dtLabel}</Badge>
                          <Badge variant="outline" className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{drLabel}</Badge>
                        </div>
                        <p className={cn("text-xs", isSelected ? "text-white/80" : "text-muted-foreground")}>{metric.metricCode}</p>
                        {metric.metricDescription ? <p className={cn("text-sm", isSelected ? "text-white/80" : "text-muted-foreground")}>{metric.metricDescription}</p> : null}
                      </div>
                      <PencilLine className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[24px] border border-dashed border-border/70 bg-background/80 px-4 py-8 text-center text-sm text-muted-foreground">No hay métricas que coincidan con el filtro actual.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84 xl:sticky xl:top-4 xl:self-start">
          <CardHeader>
            <CardTitle className="text-lg">{isEdit ? selectedMetric?.metricName : "Registrar métrica"}</CardTitle>
            <CardDescription>{isEdit ? "Al guardar, se cierra la versión vigente y se inserta una nueva (SCD2)." : "Define una nueva métrica con su tipo de dato, dirección y unidad."}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={saveMetric}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="metric-code">Código</Label>
                  <Input id="metric-code" className="rounded-xl" value={formValues.metricCode} onChange={(e) => setFormValues((c) => ({ ...c, metricCode: e.target.value }))} disabled={isEdit} />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <SingleSelectField
                    id="metric-unit"
                    label="Unidad"
                    value={formValues.unitCode || "all"}
                    options={unitOptions}
                    displayValue={(v) => {
                      const u = unitByCode.get(v);
                      return u ? `${u.unitName}${u.unitSymbol ? ` (${u.unitSymbol})` : ""}` : v;
                    }}
                    emptyLabel="Sin unidad"
                    onChange={(v) => setFormValues((c) => ({ ...c, unitCode: v === "all" ? "" : v }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="metric-name">Nombre</Label>
                  <Input id="metric-name" className="rounded-xl" value={formValues.metricName} onChange={(e) => setFormValues((c) => ({ ...c, metricName: e.target.value }))} />
                </div>
                <SingleSelectField
                  id="metric-data-type"
                  label="Tipo de dato"
                  value={formValues.dataTypeCode}
                  options={dataTypeOptions}
                  displayValue={(v) => dataTypeByCode.get(v) ?? v}
                  emptyLabel="Selecciona"
                  emptyValue=""
                  onChange={(v) => setFormValues((c) => ({ ...c, dataTypeCode: v }))}
                />
                <SingleSelectField
                  id="metric-direction"
                  label="Dirección"
                  value={formValues.directionCode}
                  options={directionOptions}
                  displayValue={(v) => directionByCode.get(v) ?? v}
                  emptyLabel="Selecciona"
                  emptyValue=""
                  onChange={(v) => setFormValues((c) => ({ ...c, directionCode: v }))}
                />
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="metric-description">Descripción</Label>
                  <textarea id="metric-description" rows={3} className="flex min-h-[96px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={formValues.metricDescription} onChange={(e) => setFormValues((c) => ({ ...c, metricDescription: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="metric-notes">Notas</Label>
                  <textarea id="metric-notes" rows={2} className="flex min-h-[72px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={formValues.notesText} onChange={(e) => setFormValues((c) => ({ ...c, notesText: e.target.value }))} />
                </div>
                {isEdit ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="metric-reason">Motivo del cambio</Label>
                    <Input id="metric-reason" className="rounded-xl" value={formValues.changeReason} onChange={(e) => setFormValues((c) => ({ ...c, changeReason: e.target.value }))} placeholder="Opcional. Se registra en el historial." />
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                {isEdit && selectedMetric ? <Button type="button" variant="outline" className="rounded-full" onClick={() => void toggleValidity(selectedMetric)}>Desactivar</Button> : null}
                <Button type="submit" className="rounded-full"><Save className="size-4" /> {isEdit ? "Guardar nueva versión" : "Crear métrica"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
