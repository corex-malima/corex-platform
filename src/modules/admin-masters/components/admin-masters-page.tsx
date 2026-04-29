"use client";

import { useState } from "react";
import useSWR from "swr";
import { DatabaseZap, FileText, Target } from "lucide-react";
import { toast } from "sonner";

import { fetchJson } from "@/lib/fetch-json";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { StandardTable, StandardTd } from "@/shared/tables/standard-table";

type GoalsPayload = {
  metrics: Array<Record<string, string | number | boolean | null>>;
  objectives: Array<Record<string, string | number | boolean | null>>;
  targets: Array<Record<string, string | number | boolean | null>>;
  dimensions: Array<Record<string, string | number | boolean | null>>;
};

const fetcher = (url: string) => fetchJson<GoalsPayload>(url, "No se pudo cargar Metas y Objetivos.");

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function EntityTable({
  title,
  rows,
  codeKey,
  nameKey,
  idKey,
  entity,
  onToggle,
}: {
  title: string;
  rows: GoalsPayload["metrics"];
  codeKey: string;
  nameKey: string;
  idKey: string;
  entity: string;
  onToggle: (entity: string, id: string, isValid: boolean) => void;
}) {
  return (
    <Card className="starter-panel">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{rows.length ? `${rows.length} registro(s)` : "Sin datos disponibles para los filtros seleccionados"}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollFadeTable className="border border-border/70">
          <StandardTable>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${title}:${String(row[codeKey])}:${index}`}>
                  <StandardTd>
                    <p className="font-medium">{String(row[nameKey] ?? "")}</p>
                    <p className="text-xs text-muted-foreground">{String(row[codeKey] ?? "")}</p>
                  </StandardTd>
                  <StandardTd><Badge variant={row.is_valid ? "success" : "outline"}>{row.is_valid ? "Activo" : "Inactivo"}</Badge></StandardTd>
                  <StandardTd>
                    <Button size="sm" variant="outline" onClick={() => onToggle(entity, String(row[idKey] ?? ""), !Boolean(row.is_valid))}>
                      {row.is_valid ? "Inactivar" : "Activar"}
                    </Button>
                  </StandardTd>
                </tr>
              ))}
              {!rows.length ? <tr><td className="px-4 py-10 text-center text-sm text-muted-foreground">Sin datos disponibles para los filtros seleccionados</td></tr> : null}
            </tbody>
          </StandardTable>
        </ScrollFadeTable>
      </CardContent>
    </Card>
  );
}

export function AdminMastersPage() {
  const { data, mutate } = useSWR("/api/admin/administracion-maestros/goals", fetcher, { revalidateOnFocus: false });
  const [metric, setMetric] = useState({ metricCode: "", metricName: "", metricType: "KPI", unitOfMeasure: "", valueFormat: "number", direction: "higher_is_better" });
  const [objective, setObjective] = useState({ objectiveCode: "", objectiveName: "", objectiveType: "operativo", objectiveStatus: "draft", periodGrain: "monthly", periodStart: "", periodEnd: "" });
  const [targetForm, setTargetForm] = useState({ targetCode: "", targetName: "", metricId: "", objectiveId: "", periodStart: "", periodEnd: "", targetOperator: ">=", targetValue: "" });
  const [dimension, setDimension] = useState({ targetId: "", dimensionLevel: "1", dimensionType: "module", dimensionKey: "", dimensionLabel: "" });

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

  return (
    <SectionPageShell
      eyebrow="Administración / Administración Maestros"
      title="Administración Maestros"
      subtitle="Gestión centralizada de catálogos, maestros y estructuras administrativas del sistema."
      icon={<Target className="size-5" />}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="starter-panel"><CardHeader><DatabaseZap className="size-5 text-emerald-600" /><CardTitle>Catálogos</CardTitle><CardDescription>Los catálogos TTHH se administran en Gestión / Talento Humano / Administrar Maestros.</CardDescription></CardHeader></Card>
        <Card className="starter-panel"><CardHeader><Target className="size-5 text-sky-600" /><CardTitle>Metas & Objetivos</CardTitle><CardDescription>Métricas, objetivos, metas y dimensiones para dashboards.</CardDescription></CardHeader></Card>
        <Card className="starter-panel"><CardHeader><FileText className="size-5 text-amber-600" /><CardTitle>Formularios</CardTitle><CardDescription>Base preparada para crecer hacia administración de formularios.</CardDescription></CardHeader></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="starter-panel">
          <CardHeader><CardTitle>Nueva métrica</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <TextField label="Código" value={metric.metricCode} onChange={(v) => setMetric((p) => ({ ...p, metricCode: v }))} />
            <TextField label="Nombre" value={metric.metricName} onChange={(v) => setMetric((p) => ({ ...p, metricName: v }))} />
            <TextField label="Tipo" value={metric.metricType} onChange={(v) => setMetric((p) => ({ ...p, metricType: v }))} />
            <TextField label="Unidad" value={metric.unitOfMeasure} onChange={(v) => setMetric((p) => ({ ...p, unitOfMeasure: v }))} />
            <TextField label="Formato" value={metric.valueFormat} onChange={(v) => setMetric((p) => ({ ...p, valueFormat: v }))} />
            <TextField label="Dirección" value={metric.direction} onChange={(v) => setMetric((p) => ({ ...p, direction: v }))} />
            <Button className="w-full" onClick={() => post({ entity: "metric", ...metric }, "Métrica creada.")}>Crear métrica</Button>
          </CardContent>
        </Card>

        <Card className="starter-panel">
          <CardHeader><CardTitle>Nuevo objetivo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <TextField label="Código" value={objective.objectiveCode} onChange={(v) => setObjective((p) => ({ ...p, objectiveCode: v }))} />
            <TextField label="Nombre" value={objective.objectiveName} onChange={(v) => setObjective((p) => ({ ...p, objectiveName: v }))} />
            <TextField label="Tipo" value={objective.objectiveType} onChange={(v) => setObjective((p) => ({ ...p, objectiveType: v }))} />
            <TextField label="Estado" value={objective.objectiveStatus} onChange={(v) => setObjective((p) => ({ ...p, objectiveStatus: v }))} />
            <TextField label="Inicio" value={objective.periodStart} onChange={(v) => setObjective((p) => ({ ...p, periodStart: v }))} />
            <TextField label="Fin" value={objective.periodEnd} onChange={(v) => setObjective((p) => ({ ...p, periodEnd: v }))} />
            <Button className="w-full" onClick={() => post({ entity: "objective", ...objective }, "Objetivo creado.")}>Crear objetivo</Button>
          </CardContent>
        </Card>

        <Card className="starter-panel">
          <CardHeader><CardTitle>Nueva meta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <TextField label="Código" value={targetForm.targetCode} onChange={(v) => setTargetForm((p) => ({ ...p, targetCode: v }))} />
            <TextField label="Nombre" value={targetForm.targetName} onChange={(v) => setTargetForm((p) => ({ ...p, targetName: v }))} />
            <TextField label="Metric ID" value={targetForm.metricId} onChange={(v) => setTargetForm((p) => ({ ...p, metricId: v }))} />
            <TextField label="Objective ID" value={targetForm.objectiveId} onChange={(v) => setTargetForm((p) => ({ ...p, objectiveId: v }))} />
            <TextField label="Inicio" value={targetForm.periodStart} onChange={(v) => setTargetForm((p) => ({ ...p, periodStart: v }))} />
            <TextField label="Fin" value={targetForm.periodEnd} onChange={(v) => setTargetForm((p) => ({ ...p, periodEnd: v }))} />
            <TextField label="Operador" value={targetForm.targetOperator} onChange={(v) => setTargetForm((p) => ({ ...p, targetOperator: v }))} />
            <TextField label="Valor" value={targetForm.targetValue} onChange={(v) => setTargetForm((p) => ({ ...p, targetValue: v }))} />
            <Button className="w-full" onClick={() => post({ entity: "target", ...targetForm }, "Meta creada.")}>Crear meta</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="starter-panel">
        <CardHeader><CardTitle>Asignar dimensión a meta</CardTitle><CardDescription>Permite granular metas por módulo, área, persona, actividad u otra dimensión.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-6">
          <TextField label="Target ID" value={dimension.targetId} onChange={(v) => setDimension((p) => ({ ...p, targetId: v }))} />
          <TextField label="Nivel" value={dimension.dimensionLevel} onChange={(v) => setDimension((p) => ({ ...p, dimensionLevel: v }))} />
          <TextField label="Tipo" value={dimension.dimensionType} onChange={(v) => setDimension((p) => ({ ...p, dimensionType: v }))} />
          <TextField label="Clave" value={dimension.dimensionKey} onChange={(v) => setDimension((p) => ({ ...p, dimensionKey: v }))} />
          <TextField label="Etiqueta" value={dimension.dimensionLabel} onChange={(v) => setDimension((p) => ({ ...p, dimensionLabel: v }))} />
          <div className="flex items-end"><Button className="w-full" onClick={() => post({ entity: "dimension", ...dimension }, "Dimensión asignada.")}>Asignar</Button></div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <EntityTable title="Métricas" rows={data?.metrics ?? []} codeKey="metric_code" nameKey="metric_name" idKey="metric_id" entity="metric" onToggle={(entity, id, isValid) => post({ action: "set-validity", entity, id, isValid }, "Estado actualizado.")} />
        <EntityTable title="Objetivos" rows={data?.objectives ?? []} codeKey="objective_code" nameKey="objective_name" idKey="objective_id" entity="objective" onToggle={(entity, id, isValid) => post({ action: "set-validity", entity, id, isValid }, "Estado actualizado.")} />
        <EntityTable title="Metas" rows={data?.targets ?? []} codeKey="target_code" nameKey="target_name" idKey="target_id" entity="target" onToggle={(entity, id, isValid) => post({ action: "set-validity", entity, id, isValid }, "Estado actualizado.")} />
      </div>
    </SectionPageShell>
  );
}
