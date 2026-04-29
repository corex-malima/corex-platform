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

type GoalRow = Record<string, string | number | boolean | null>;
type GoalsPayload = { metrics: GoalRow[]; objectives: GoalRow[]; targets: GoalRow[]; dimensions: GoalRow[] };

const EMPTY_OBJECTIVE = {
  objectiveCode: "",
  objectiveName: "",
  objectiveType: "operativo",
  objectiveStatus: "draft",
  periodGrain: "monthly",
  periodStart: "",
  periodEnd: "",
};

const EMPTY_TARGET = {
  targetCode: "",
  targetName: "",
  metricId: "",
  objectiveId: "",
  periodStart: "",
  periodEnd: "",
  targetOperator: ">=",
  targetValue: "",
};

const fetcher = (url: string) => fetchJson<GoalsPayload>(url, "No se pudo cargar Metas y Objetivos.");

export function AdminMastersPage() {
  const { data, mutate, isValidating } = useSWR("/api/admin/administracion-maestros/goals", fetcher, { revalidateOnFocus: false });
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [objectiveForm, setObjectiveForm] = useState(EMPTY_OBJECTIVE);
  const [targetForm, setTargetForm] = useState(EMPTY_TARGET);
  const deferredSearch = useDeferredValue(search);

  const metrics = useMemo(() => data?.metrics ?? [], [data?.metrics]);
  const objectives = useMemo(() => data?.objectives ?? [], [data?.objectives]);
  const targets = useMemo(() => data?.targets ?? [], [data?.targets]);
  const selectedObjective = selectedObjectiveId ? objectives.find((objective) => String(objective.objective_id) === selectedObjectiveId) ?? null : null;
  const objectiveTargets = selectedObjectiveId ? targets.filter((target) => String(target.objective_id ?? "") === selectedObjectiveId) : targets;

  const filteredObjectives = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) return objectives;
    return objectives.filter((objective) => [objective.objective_code, objective.objective_name, objective.objective_type, objective.objective_status]
      .some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [deferredSearch, objectives]);

  function openCreateObjective() {
    startTransition(() => {
      setSelectedObjectiveId(null);
      setObjectiveForm(EMPTY_OBJECTIVE);
      setTargetForm(EMPTY_TARGET);
    });
  }

  function openEditObjective(objective: GoalRow) {
    const objectiveId = String(objective.objective_id);
    startTransition(() => {
      setSelectedObjectiveId(objectiveId);
      setObjectiveForm({
        objectiveCode: String(objective.objective_code ?? ""),
        objectiveName: String(objective.objective_name ?? ""),
        objectiveType: String(objective.objective_type ?? "operativo"),
        objectiveStatus: String(objective.objective_status ?? "draft"),
        periodGrain: String(objective.period_grain ?? "monthly"),
        periodStart: String(objective.period_start ?? ""),
        periodEnd: String(objective.period_end ?? ""),
      });
      setTargetForm((current) => ({ ...current, objectiveId }));
    });
  }

  async function post(body: Record<string, unknown>, success: string) {
    try {
      await fetchJson("/api/admin/administracion-maestros/goals", "No se pudo guardar.", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success(success);
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    }
  }

  async function saveObjective(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!objectiveForm.objectiveCode.trim() || !objectiveForm.objectiveName.trim()) {
      toast.error("Código y nombre del objetivo son obligatorios.");
      return;
    }
    await post({ entity: "objective", ...objectiveForm }, "Objetivo creado.");
  }

  async function saveTarget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targetForm.targetCode.trim() || !targetForm.targetName.trim() || !targetForm.metricId || !targetForm.periodStart || !targetForm.periodEnd) {
      toast.error("Meta incompleta: código, nombre, métrica y periodo son obligatorios.");
      return;
    }
    await post({ entity: "target", ...targetForm }, "Meta creada.");
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Administración / Administración Maestros"
        title="Metas & Objetivos"
        subtitle="Administra objetivos y sus metas asociadas usando el mismo patrón operativo de maestros."
        icon={<Target className="size-5" aria-hidden="true" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void mutate()}>
              <RefreshCcw className={cn("size-4", isValidating && "animate-spin")} />
              Recargar
            </Button>
            <Button type="button" className="rounded-full" onClick={openCreateObjective}>
              <Plus className="size-4" />
              Nuevo objetivo
            </Button>
          </div>
        )}
      >
        <FilterPanel>
          <KpiGrid>
            <MetricTile label="Objetivos activos" value={String(objectives.filter((objective) => objective.is_valid).length)} hint="Objetivos vigentes." />
            <MetricTile label="Metas activas" value={String(targets.filter((target) => target.is_valid).length)} hint="Metas asociadas a métricas." />
            <MetricTile label="Métricas disponibles" value={String(metrics.filter((metric) => metric.is_valid).length)} hint="Se administran en el apartado Métricas." />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <CardTitle className="text-lg">Listado de objetivos</CardTitle>
            <div className="space-y-2">
              <Label htmlFor="objective-search">Buscar objetivo</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="objective-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nombre, tipo o estado..." className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
              {filteredObjectives.length ? filteredObjectives.map((objective) => {
                const isSelected = selectedObjectiveId === String(objective.objective_id);
                const count = targets.filter((target) => String(target.objective_id ?? "") === String(objective.objective_id)).length;
                return (
                  <button key={String(objective.objective_id)} type="button" onClick={() => openEditObjective(objective)} className={cn("w-full rounded-[24px] border px-5 py-4 text-left transition-colors", isSelected ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "border-border/70 bg-background/80 hover:border-slate-300 hover:bg-background")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{String(objective.objective_name ?? "")}</p>
                          <Badge variant={isSelected ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{count} metas</Badge>
                        </div>
                        <p className={cn("text-xs", isSelected ? "text-white/80" : "text-muted-foreground")}>{String(objective.objective_code ?? "")} · {String(objective.objective_status ?? "")}</p>
                      </div>
                      <PencilLine className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                  </button>
                );
              }) : <div className="rounded-[24px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">No hay objetivos que coincidan.</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84 xl:sticky xl:top-4 xl:self-start">
          <CardHeader>
            <CardTitle className="text-lg">{selectedObjective ? String(selectedObjective.objective_code) : "Registrar objetivo"}</CardTitle>
            <CardDescription>Crea el objetivo y luego asigna metas con métrica, periodo y valor esperado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-5" onSubmit={saveObjective}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Código</Label><Input className="rounded-xl" value={objectiveForm.objectiveCode} onChange={(event) => setObjectiveForm((current) => ({ ...current, objectiveCode: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Tipo</Label><Input className="rounded-xl" value={objectiveForm.objectiveType} onChange={(event) => setObjectiveForm((current) => ({ ...current, objectiveType: event.target.value }))} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Nombre</Label><Input className="rounded-xl" value={objectiveForm.objectiveName} onChange={(event) => setObjectiveForm((current) => ({ ...current, objectiveName: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Inicio</Label><Input type="date" className="rounded-xl" value={objectiveForm.periodStart} onChange={(event) => setObjectiveForm((current) => ({ ...current, periodStart: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Fin</Label><Input type="date" className="rounded-xl" value={objectiveForm.periodEnd} onChange={(event) => setObjectiveForm((current) => ({ ...current, periodEnd: event.target.value }))} /></div>
              </div>
              <div className="flex justify-end"><Button type="submit" className="rounded-full"><Save className="size-4" /> Guardar objetivo</Button></div>
            </form>

            <form className="space-y-5 border-t border-border/70 pt-5" onSubmit={saveTarget}>
              <div>
                <h3 className="text-sm font-semibold">Meta asociada</h3>
                <p className="text-xs text-muted-foreground">Define la meta concreta del objetivo seleccionado.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>Código</Label><Input className="rounded-xl" value={targetForm.targetCode} onChange={(event) => setTargetForm((current) => ({ ...current, targetCode: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Métrica</Label><select className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={targetForm.metricId} onChange={(event) => setTargetForm((current) => ({ ...current, metricId: event.target.value }))}><option value="">Seleccionar</option>{metrics.map((metric) => <option key={String(metric.metric_id)} value={String(metric.metric_id)}>{String(metric.metric_code)} · {String(metric.metric_name)}</option>)}</select></div>
                <div className="space-y-2 md:col-span-2"><Label>Nombre</Label><Input className="rounded-xl" value={targetForm.targetName} onChange={(event) => setTargetForm((current) => ({ ...current, targetName: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Inicio</Label><Input type="date" className="rounded-xl" value={targetForm.periodStart} onChange={(event) => setTargetForm((current) => ({ ...current, periodStart: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Fin</Label><Input type="date" className="rounded-xl" value={targetForm.periodEnd} onChange={(event) => setTargetForm((current) => ({ ...current, periodEnd: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Operador</Label><Input className="rounded-xl" value={targetForm.targetOperator} onChange={(event) => setTargetForm((current) => ({ ...current, targetOperator: event.target.value }))} /></div>
                <div className="space-y-2"><Label>Valor</Label><Input className="rounded-xl" value={targetForm.targetValue} onChange={(event) => setTargetForm((current) => ({ ...current, targetValue: event.target.value }))} /></div>
              </div>
              <div className="flex justify-end"><Button type="submit" className="rounded-full"><Save className="size-4" /> Guardar meta</Button></div>
            </form>

            <div className="max-h-[220px] space-y-2 overflow-y-auto pr-1">
              {objectiveTargets.length ? objectiveTargets.map((target) => (
                <div key={String(target.target_id)} className="rounded-[18px] border border-border/70 bg-background/80 px-4 py-3">
                  <p className="text-sm font-medium">{String(target.target_name ?? "")}</p>
                  <p className="text-xs text-muted-foreground">{String(target.target_code ?? "")} · {String(target.target_operator ?? "")} {String(target.target_value ?? "")}</p>
                </div>
              )) : <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">Sin metas para el objetivo seleccionado.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
