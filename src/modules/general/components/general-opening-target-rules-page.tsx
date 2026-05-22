"use client";

import { startTransition, useDeferredValue, useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarClock, Plus, RefreshCcw, Search, Target } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

import type {
  GeneralOpeningTargetRuleInput,
  GeneralOpeningTargetRuleModuleData,
  GeneralOpeningTargetRuleRecord,
} from "@/lib/general-opening-target-rules";
import { fetchJson } from "@/lib/fetch-json";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { formatDateTime } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

type EditorMode = "create" | "edit";

type FormValues = {
  code: string;
  name: string;
  validFrom: string;
  openingPointCategoryId: string;
  varietyId: string;
  notes: string;
  isActive: boolean;
  changeReason: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const API_ENDPOINT = "/api/general/reglas-operativas/punto-apertura";

const moduleFetcher = (url: string) =>
  fetchJson<GeneralOpeningTargetRuleModuleData>(url, "No se pudo cargar las reglas de punto de apertura.");

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function buildEmptyForm(defaultOpeningPointId: string): FormValues {
  return {
    code: "",
    name: "",
    validFrom: todayDateInput(),
    openingPointCategoryId: defaultOpeningPointId,
    varietyId: "",
    notes: "",
    isActive: true,
    changeReason: "",
  };
}

function mapRecordToFormValues(record: GeneralOpeningTargetRuleRecord): FormValues {
  return {
    code: record.code,
    name: record.name,
    validFrom: record.validFrom,
    openingPointCategoryId: record.openingPointCategoryId ?? "",
    varietyId: record.varietyId ?? "",
    notes: record.notes ?? "",
    isActive: record.isActive,
    changeReason: "",
  };
}

function buildPayload(values: FormValues): GeneralOpeningTargetRuleInput {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    validFrom: values.validFrom,
    openingPointCategoryId: values.openingPointCategoryId,
    varietyId: values.varietyId || null,
    notes: values.notes.trim() || null,
    isActive: values.isActive,
    changeReason: values.changeReason.trim() || null,
  };
}

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.code.trim()) errors.code = "El codigo de la regla es obligatorio.";
  if (!values.name.trim()) errors.name = "El nombre de la regla es obligatorio.";
  if (!values.validFrom.trim()) errors.validFrom = "La fecha de vigencia es obligatoria.";
  if (!values.openingPointCategoryId.trim()) errors.openingPointCategoryId = "La categoria objetivo es obligatoria.";

  return errors;
}

function buildRuleStatus(rule: GeneralOpeningTargetRuleRecord) {
  if (!rule.isActive) return { label: "Inactiva", variant: "outline" as const };
  if (rule.varietyId) return { label: "Especifica", variant: "secondary" as const };
  return { label: "General", variant: "default" as const };
}

export function GeneralOpeningTargetRulesPage({
  initialData,
  initialError,
}: {
  initialData: GeneralOpeningTargetRuleModuleData;
  initialError?: string | null;
}) {
  const defaultOpeningPointId = initialData.options.openingPoints[0]?.value ?? "";
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(initialData.rules[0]?.ruleId ?? null);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>(buildEmptyForm(defaultOpeningPointId));
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const deferredSearch = useDeferredValue(search);

  const { data, isValidating, mutate } = useSWR(
    API_ENDPOINT,
    moduleFetcher,
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      dedupingInterval: 15_000,
      onError: (error) => toast.error(error?.message || "No se pudo cargar las reglas."),
    },
  );

  const moduleData = data ?? initialData;
  const selectedRule = editorMode === "edit"
    ? moduleData.rules.find((rule) => rule.ruleId === selectedRuleId) ?? null
    : null;

  const baselinePayload = useMemo(
    () => buildPayload(selectedRule ? mapRecordToFormValues(selectedRule) : buildEmptyForm(defaultOpeningPointId)),
    [defaultOpeningPointId, selectedRule],
  );
  const currentPayload = useMemo(() => buildPayload(formValues), [formValues]);
  const isDirty = JSON.stringify(currentPayload) !== JSON.stringify(baselinePayload);

  const filteredRules = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) return moduleData.rules;

    return moduleData.rules.filter((rule) =>
      [
        rule.code,
        rule.name,
        rule.scopeLabel,
        rule.varietyName,
        rule.openingPointCategoryName,
      ].some((value) => String(value ?? "").toLowerCase().includes(normalized)),
    );
  }, [deferredSearch, moduleData.rules]);

  useEffect(() => {
    setFormValues(selectedRule ? mapRecordToFormValues(selectedRule) : buildEmptyForm(defaultOpeningPointId));
    setFormErrors({});
  }, [defaultOpeningPointId, selectedRule]);

  function updateField<Key extends keyof FormValues>(field: Key, value: FormValues[Key]) {
    setFormValues((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: undefined }));
  }

  function openCreateMode() {
    startTransition(() => {
      setEditorMode("create");
      setSelectedRuleId(null);
      setFormValues(buildEmptyForm(defaultOpeningPointId));
      setFormErrors({});
    });
  }

  function openEditMode(ruleId: string) {
    startTransition(() => {
      setEditorMode("edit");
      setSelectedRuleId(ruleId);
    });
  }

  function resetForm() {
    setFormValues(selectedRule ? mapRecordToFormValues(selectedRule) : buildEmptyForm(defaultOpeningPointId));
    setFormErrors({});
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateForm(formValues);
    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      toast.error("Revisa los campos obligatorios antes de guardar.");
      return;
    }

    setIsSaving(true);

    try {
      const isEditing = editorMode === "edit" && selectedRuleId;
      const endpoint = isEditing ? `${API_ENDPOINT}/${encodeURIComponent(selectedRuleId)}` : API_ENDPOINT;
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetchJson<{ data: GeneralOpeningTargetRuleRecord }>(
        endpoint,
        "No se pudo guardar la regla de punto de apertura.",
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(currentPayload),
        },
      );

      toast.success(isEditing ? "Regla actualizada correctamente." : "Regla registrada correctamente.");
      await mutate();
      startTransition(() => {
        setEditorMode("edit");
        setSelectedRuleId(response.data.ruleId);
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la regla.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Gestión / General / Reglas operativas"
        title="Punto de apertura"
        subtitle="Registra el criterio objetivo vigente para comparar la medición real de Calidad y luego construir KPIs de cumplimiento por responsable y variedad."
        icon={<Target className="size-5" aria-hidden="true" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                void mutate();
              }}
            >
              <RefreshCcw className={isValidating ? "size-4 animate-spin" : "size-4"} />
              Recargar
            </Button>
            <Button type="button" className="rounded-full" onClick={openCreateMode}>
              <Plus className="size-4" />
              Nueva regla
            </Button>
          </div>
        )}
      >
        <FilterPanel>
          <KpiGrid>
            <MetricTile
              label="Reglas vigentes"
              value={String(moduleData.summary.totalRules)}
              hint="Versiones vigentes visibles para parametrizar la comparación operativa."
            />
            <MetricTile
              label="Reglas activas"
              value={String(moduleData.summary.activeRules)}
              hint="Reglas listas para ser tomadas por la lógica analítica según su vigencia."
            />
            <MetricTile
              label="Alcance general"
              value={String(moduleData.summary.generalRules)}
              hint="Reglas que aplican a toda la operación, sin filtrar por variedad."
            />
            <MetricTile
              label="Alcance específico"
              value={String(moduleData.summary.scopedRules)}
              hint="Reglas que ya discriminan por variedad."
            />
          </KpiGrid>

          {initialError ? (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {initialError}
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[24px] border border-border/70 shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Reglas vigentes</CardTitle>
                    <CardDescription>
                      Selecciona una regla para programar el siguiente cambio de criterio o registra un alcance nuevo.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    db_general.public
                  </Badge>
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por codigo, nombre o variedad..."
                    className="rounded-xl pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredRules.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                    No hay reglas que coincidan con tu búsqueda.
                  </div>
                ) : (
                  filteredRules.map((rule) => {
                    const status = buildRuleStatus(rule);
                    const isSelected = selectedRuleId === rule.ruleId && editorMode === "edit";

                    return (
                      <button
                        key={rule.ruleId}
                        type="button"
                        onClick={() => openEditMode(rule.ruleId)}
                        className={`w-full rounded-[22px] border px-4 py-4 text-left transition-colors ${
                          isSelected
                            ? "border-slate-900 bg-slate-50"
                            : "border-border/70 bg-background hover:border-slate-300"
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="rounded-full px-3 py-1 font-mono">
                            {rule.code}
                          </Badge>
                          <Badge variant={status.variant} className="rounded-full px-3 py-1">
                            {status.label}
                          </Badge>
                          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                            Desde {rule.validFrom}
                          </span>
                        </div>
                        <div className="mt-3 space-y-2">
                          <p className="font-semibold">{rule.name}</p>
                          <p className="text-sm text-muted-foreground">{rule.scopeLabel}</p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                            <Badge variant="outline" className="rounded-full px-3 py-1">
                              {rule.openingPointCategoryName ?? `${rule.targetClassMin} a ${rule.targetClassMax}`}
                            </Badge>
                            {rule.loadedAt ? (
                              <span className="text-xs text-muted-foreground">
                                Última carga: {formatDateTime(rule.loadedAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[24px] border border-border/70 shadow-sm">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>{editorMode === "edit" ? "Programar siguiente versión" : "Registrar regla"}</CardTitle>
                    <CardDescription>
                      Cada guardado crea una nueva versión SCD2 y cierra automáticamente la versión anterior del mismo alcance.
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    <CalendarClock className="mr-2 size-3.5" />
                    Vigencia
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={onSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="opening-rule-code">Código *</Label>
                      <Input
                        id="opening-rule-code"
                        value={formValues.code}
                        onChange={(event) => updateField("code", event.target.value)}
                        className="rounded-xl"
                        placeholder="Ej. PA-GENERAL"
                      />
                      {formErrors.code ? <p className="text-xs text-destructive">{formErrors.code}</p> : null}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="opening-rule-valid-from">Vigente desde *</Label>
                      <Input
                        id="opening-rule-valid-from"
                        type="date"
                        value={formValues.validFrom}
                        onChange={(event) => updateField("validFrom", event.target.value)}
                        className="rounded-xl"
                      />
                      {formErrors.validFrom ? <p className="text-xs text-destructive">{formErrors.validFrom}</p> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opening-rule-name">Nombre *</Label>
                    <Input
                      id="opening-rule-name"
                      value={formValues.name}
                      onChange={(event) => updateField("name", event.target.value)}
                      className="rounded-xl"
                      placeholder="Ej. Regla general para exportación"
                    />
                    {formErrors.name ? <p className="text-xs text-destructive">{formErrors.name}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opening-rule-category">Categoría objetivo *</Label>
                    <select
                      id="opening-rule-category"
                      value={formValues.openingPointCategoryId}
                      onChange={(event) => updateField("openingPointCategoryId", event.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Selecciona una categoría</option>
                      {moduleData.options.openingPoints.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.meta ? `${option.label} · ${option.meta}` : option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.openingPointCategoryId ? <p className="text-xs text-destructive">{formErrors.openingPointCategoryId}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opening-rule-variety">Variedad</Label>
                    <select
                      id="opening-rule-variety"
                      value={formValues.varietyId}
                      onChange={(event) => updateField("varietyId", event.target.value)}
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Todas las variedades</option>
                      {moduleData.options.varieties.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.meta ? `${option.label} · ${option.meta}` : option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opening-rule-notes">Observaciones</Label>
                    <textarea
                      id="opening-rule-notes"
                      value={formValues.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                      placeholder="Opcional. Ej. regla temporal para cliente sensible o cambio operativo definido por gerencia."
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                    <label className="flex items-center gap-3 rounded-[18px] border border-border/70 px-4 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={formValues.isActive}
                        onChange={(event) => updateField("isActive", event.target.checked)}
                        className="size-4"
                      />
                      Mantener regla activa
                    </label>
                    <div className="space-y-2">
                      <Label htmlFor="opening-rule-change-reason">Motivo del cambio</Label>
                      <Input
                        id="opening-rule-change-reason"
                        value={formValues.changeReason}
                        onChange={(event) => updateField("changeReason", event.target.value)}
                        className="rounded-xl"
                        placeholder="Opcional. Ej. ajuste de criterio solicitado por gerencia."
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" className="rounded-full" onClick={resetForm} disabled={!isDirty || isSaving}>
                      Revertir
                    </Button>
                    <Button type="submit" className="rounded-full" disabled={isSaving || !isDirty}>
                      {isSaving ? "Guardando..." : editorMode === "edit" ? "Programar nueva versión" : "Guardar regla"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {moduleData.notes.length > 0 ? (
            <Card className="rounded-[24px] border border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>Consideraciones operativas</CardTitle>
                <CardDescription>
                  Esta primera versión ya queda enlazada al maestro general de categorías de punto de apertura.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {moduleData.notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </FilterPanel>
      </SectionPageShell>
    </div>
  );
}
