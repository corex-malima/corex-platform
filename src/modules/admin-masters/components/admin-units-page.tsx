"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";
import { PencilLine, Plus, RefreshCcw, Save, Scale, Search } from "lucide-react";
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

type AdminUnit = {
  unitCode: string;
  unitName: string;
  unitSymbol: string | null;
  unitCategoryCode: string | null;
  notesText: string | null;
  validFrom: string;
  validTo: string | null;
  actorId: string | null;
  changeReason: string;
};
type AdminCatalogItem = { catalogCode: string; itemCode: string; itemLabelEs: string };
type UnitsPayload = { units: AdminUnit[]; unitCategories: AdminCatalogItem[] };

const ENDPOINT = "/api/admin/administracion-maestros/unidades";
const fetcher = (url: string) => fetchJson<UnitsPayload>(url, "No se pudo cargar unidades.");

const EMPTY_UNIT = {
  unitCode: "",
  unitName: "",
  unitSymbol: "",
  unitCategoryCode: "",
  notesText: "",
  changeReason: "",
};

export function AdminUnitsPage() {
  const { data, mutate, isValidating } = useSWR(ENDPOINT, fetcher, { revalidateOnFocus: false });
  const [selectedUnitCode, setSelectedUnitCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_UNIT);
  const deferredSearch = useDeferredValue(search);

  const units = useMemo(() => data?.units ?? [], [data?.units]);
  const categories = useMemo(() => data?.unitCategories ?? [], [data?.unitCategories]);
  const categoryByCode = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.itemCode, c.itemLabelEs));
    return map;
  }, [categories]);

  const selectedUnit = selectedUnitCode ? units.find((u) => u.unitCode === selectedUnitCode) ?? null : null;
  const isEdit = selectedUnit !== null;
  const categoryOptions = useMemo(() => categories.map((c) => c.itemCode), [categories]);

  const filteredUnits = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    return units.filter((u) => {
      const sameCategory = !categoryFilter || categoryFilter === "all" || u.unitCategoryCode === categoryFilter;
      const matchesSearch = !normalized || [u.unitCode, u.unitName, u.unitSymbol, u.unitCategoryCode]
        .some((v) => String(v ?? "").toLowerCase().includes(normalized));
      return sameCategory && matchesSearch;
    });
  }, [deferredSearch, categoryFilter, units]);

  function openCreateMode() {
    startTransition(() => {
      setSelectedUnitCode(null);
      setFormValues(EMPTY_UNIT);
    });
  }

  function openEditMode(unit: AdminUnit) {
    startTransition(() => {
      setSelectedUnitCode(unit.unitCode);
      setFormValues({
        unitCode: unit.unitCode,
        unitName: unit.unitName,
        unitSymbol: unit.unitSymbol ?? "",
        unitCategoryCode: unit.unitCategoryCode ?? "",
        notesText: unit.notesText ?? "",
        changeReason: "",
      });
    });
  }

  async function saveUnit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValues.unitCode.trim() || !formValues.unitName.trim()) {
      toast.error("Código y nombre son obligatorios.");
      return;
    }
    const payload = {
      unitCode: formValues.unitCode.trim(),
      unitName: formValues.unitName.trim(),
      unitSymbol: formValues.unitSymbol.trim() || null,
      unitCategoryCode: formValues.unitCategoryCode || null,
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
        toast.success("Unidad actualizada (nueva versión SCD2).");
      } else {
        await fetchJson(ENDPOINT, "No se pudo crear.", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.success("Unidad creada.");
      }
      setSelectedUnitCode(payload.unitCode);
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    }
  }

  async function toggleValidity(unit: AdminUnit) {
    try {
      await fetchJson(ENDPOINT, "No se pudo cambiar la validez.", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-validity", unitCode: unit.unitCode, isValid: false }),
      });
      toast.success("Unidad desactivada.");
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cambiar la validez.");
    }
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Administración / Administración Maestros / Unidades"
        title="Unidades de medida"
        subtitle="Maestro de unidades (kg, %, horas, tallos, etc.) usadas en métricas y tableros."
        icon={<Scale className="size-5" aria-hidden="true" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void mutate()}>
              <RefreshCcw className={cn("size-4", isValidating && "animate-spin")} />
              Recargar
            </Button>
            <Button type="button" className="rounded-full" onClick={openCreateMode}>
              <Plus className="size-4" />
              Nueva unidad
            </Button>
          </div>
        )}
      >
        <FilterPanel>
          <KpiGrid columns={3}>
            <MetricTile label="Unidades activas" value={String(units.length)} hint="Versión vigente disponible." />
            <MetricTile label="Categorías" value={String(categories.length)} hint="Catálogo unit_categories." />
            <MetricTile label="Unidad seleccionada" value={selectedUnit?.unitName ?? "-"} hint={selectedUnit?.unitSymbol ?? "Selecciona para editar"} />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-900/20 dark:text-white">
                <Scale className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Unidades disponibles</CardTitle>
                <CardDescription>Selecciona una unidad para editarla o crea una nueva.</CardDescription>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[0.8fr_1fr]">
              <SingleSelectField
                id="unit-category-filter"
                label="Categoría"
                value={categoryFilter || "all"}
                options={categoryOptions}
                displayValue={(v) => categoryByCode.get(v) ?? v}
                emptyLabel="Todas"
                onChange={(v) => setCategoryFilter(v === "all" ? "" : v)}
              />
              <div className="space-y-2">
                <Label htmlFor="unit-search">Buscar unidad</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="unit-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, nombre o símbolo..." className="pl-10" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
              {filteredUnits.length ? filteredUnits.map((unit) => {
                const isSelected = selectedUnitCode === unit.unitCode;
                const categoryLabel = unit.unitCategoryCode ? categoryByCode.get(unit.unitCategoryCode) ?? unit.unitCategoryCode : "Sin categoría";
                return (
                  <button key={unit.unitCode} type="button" onClick={() => openEditMode(unit)} className={cn("w-full rounded-[24px] border px-5 py-4 text-left transition-colors", isSelected ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "border-border/70 bg-background/80 hover:border-slate-300 hover:bg-background")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{unit.unitName}</p>
                          {unit.unitSymbol ? <Badge variant={isSelected ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{unit.unitSymbol}</Badge> : null}
                          <Badge variant="outline" className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{categoryLabel}</Badge>
                        </div>
                        <p className={cn("text-xs", isSelected ? "text-white/80" : "text-muted-foreground")}>{unit.unitCode}</p>
                        {unit.notesText ? <p className={cn("text-sm", isSelected ? "text-white/80" : "text-muted-foreground")}>{unit.notesText}</p> : null}
                      </div>
                      <PencilLine className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[24px] border border-dashed border-border/70 bg-background/80 px-4 py-8 text-center text-sm text-muted-foreground">No hay unidades que coincidan con el filtro actual.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84 xl:sticky xl:top-4 xl:self-start">
          <CardHeader>
            <CardTitle className="text-lg">{isEdit ? selectedUnit?.unitName : "Registrar unidad"}</CardTitle>
            <CardDescription>{isEdit ? "Al guardar, se cierra la versión vigente y se inserta una nueva (SCD2)." : "Define una nueva unidad de medida."}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={saveUnit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unit-code">Código</Label>
                  <Input id="unit-code" className="rounded-xl" value={formValues.unitCode} onChange={(e) => setFormValues((c) => ({ ...c, unitCode: e.target.value }))} disabled={isEdit} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit-symbol">Símbolo</Label>
                  <Input id="unit-symbol" className="rounded-xl" value={formValues.unitSymbol} onChange={(e) => setFormValues((c) => ({ ...c, unitSymbol: e.target.value }))} placeholder="kg, %, ha..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="unit-name">Nombre</Label>
                  <Input id="unit-name" className="rounded-xl" value={formValues.unitName} onChange={(e) => setFormValues((c) => ({ ...c, unitName: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <SingleSelectField
                    id="unit-category"
                    label="Categoría"
                    value={formValues.unitCategoryCode || "all"}
                    options={categoryOptions}
                    displayValue={(v) => categoryByCode.get(v) ?? v}
                    emptyLabel="Sin categoría"
                    onChange={(v) => setFormValues((c) => ({ ...c, unitCategoryCode: v === "all" ? "" : v }))}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="unit-notes">Notas</Label>
                  <textarea id="unit-notes" rows={3} className="flex min-h-[96px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={formValues.notesText} onChange={(e) => setFormValues((c) => ({ ...c, notesText: e.target.value }))} />
                </div>
                {isEdit ? (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="unit-reason">Motivo del cambio</Label>
                    <Input id="unit-reason" className="rounded-xl" value={formValues.changeReason} onChange={(e) => setFormValues((c) => ({ ...c, changeReason: e.target.value }))} placeholder="Opcional. Se registra en el historial." />
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-2">
                {isEdit && selectedUnit ? (
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => void toggleValidity(selectedUnit)}>Desactivar</Button>
                ) : null}
                <Button type="submit" className="rounded-full"><Save className="size-4" /> {isEdit ? "Guardar nueva versión" : "Crear unidad"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
