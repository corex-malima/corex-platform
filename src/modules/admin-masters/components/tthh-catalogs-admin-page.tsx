"use client";
import { startTransition, useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";
import { DatabaseZap, PencilLine, Plus, RefreshCcw, Save, Search } from "lucide-react";
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
type CatalogDomain = { domainCode: string; domainName: string; domainDescription: string | null; moduleCode: string; displayOrder: number; isValid: boolean };
type CatalogGroup = { catalogCode: string; catalogName: string; catalogDescription: string | null; domainCode: string; isValid: boolean };
type CatalogItem = { catalogCode: string; itemCode: string; itemLabelEs: string; itemDescription: string | null; displayOrder: number; isValid: boolean };
type CatalogPayload = { domains: CatalogDomain[]; groups: CatalogGroup[]; items: CatalogItem[] };
type EditorMode = "create" | "edit";
const fetcher = (url: string) => fetchJson<CatalogPayload>(url, "No se pudo cargar catálogos TTHH.");
const EMPTY_GROUP = {
  catalogCode: "",
  catalogName: "",
  catalogDescription: "",
  domainCode: "seguimiento_trabajo_social",
  isValid: true,
};
const EMPTY_ITEM = {
  itemCode: "",
  itemLabelEs: "",
  itemDescription: "",
  displayOrder: "0",
  isValid: true,
};
export function TthhCatalogsAdminPage() {
  const { data, mutate, isValidating } = useSWR("/api/talento-humano/catalogos", fetcher, { revalidateOnFocus: false });
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState("seguimiento_trabajo_social");
  const [search, setSearch] = useState("");
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const deferredSearch = useDeferredValue(search);
  const domains = useMemo(() => data?.domains ?? [], [data?.domains]);
  const groups = useMemo(() => data?.groups ?? [], [data?.groups]);
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const activeCatalogCode = selectedCatalogCode ?? groups.find((group) => group.domainCode === domainFilter)?.catalogCode ?? groups[0]?.catalogCode ?? "";
  const activeCatalog = groups.find((group) => group.catalogCode === activeCatalogCode) ?? null;
  const activeDomain = domains.find((domain) => domain.domainCode === domainFilter) ?? null;
  const filteredGroups = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    return groups.filter((group) => {
      const sameDomain = !domainFilter || group.domainCode === domainFilter;
      const matchesSearch = !normalized || [group.catalogCode, group.catalogName, group.catalogDescription]
        .some((value) => String(value ?? "").toLowerCase().includes(normalized));
      return sameDomain && matchesSearch;
    });
  }, [deferredSearch, domainFilter, groups]);
  const visibleItems = useMemo(
    () => items.filter((item) => item.catalogCode === activeCatalogCode),
    [activeCatalogCode, items],
  );

  function openCreateCatalog() {
    startTransition(() => {
      setEditorMode("create");
      setSelectedCatalogCode(null);
      setGroupForm({ ...EMPTY_GROUP, domainCode: domainFilter || "seguimiento_trabajo_social" });
      setItemForm(EMPTY_ITEM);
    });
  }

  function openEditCatalog(catalog: CatalogGroup) {
    startTransition(() => {
      setEditorMode("edit");
      setSelectedCatalogCode(catalog.catalogCode);
      setDomainFilter(catalog.domainCode);
      setGroupForm({
        catalogCode: catalog.catalogCode,
        catalogName: catalog.catalogName,
        catalogDescription: catalog.catalogDescription ?? "",
        domainCode: catalog.domainCode,
        isValid: catalog.isValid,
      });
      setItemForm(EMPTY_ITEM);
    });
  }

  async function post(body: Record<string, unknown>, success: string) {
    try {
      await fetchJson("/api/talento-humano/catalogos", "No se pudo guardar.", {
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

  async function saveCatalog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupForm.catalogCode.trim() || !groupForm.catalogName.trim()) {
      toast.error("Código y nombre del catálogo son obligatorios.");
      return;
    }
    await post({ kind: "group", action: "upsert", ...groupForm }, editorMode === "edit" ? "Catálogo actualizado." : "Catálogo creado.");
    setSelectedCatalogCode(groupForm.catalogCode.trim());
    setEditorMode("edit");
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeCatalogCode || !itemForm.itemCode.trim() || !itemForm.itemLabelEs.trim()) {
      toast.error("Catálogo, código y etiqueta son obligatorios.");
      return;
    }
    await post({
      kind: "item",
      action: "upsert",
      catalogCode: activeCatalogCode,
      ...itemForm,
      displayOrder: Number(itemForm.displayOrder) || 0,
    }, "Opción guardada.");
    setItemForm(EMPTY_ITEM);
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Gestión / Talento Humano / Administrar Maestros"
        title="Catálogos TTHH"
        subtitle="Administra catálogos y opciones por dominio. Para Seguimiento Trabajo Social, cada pregunta mantiene sus opciones gobernadas aquí."
        icon={<DatabaseZap className="size-5" aria-hidden="true" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void mutate()}>
              <RefreshCcw className={cn("size-4", isValidating && "animate-spin")} />
              Recargar
            </Button>
            <Button type="button" className="rounded-full" onClick={openCreateCatalog}>
              <Plus className="size-4" />
              Nuevo catálogo
            </Button>
          </div>
        )}
      >
        <FilterPanel>
          <KpiGrid>
            <MetricTile label="Dominios" value={String(domains.filter((domain) => domain.isValid).length)} hint="Agrupan catálogos por formulario o proceso." />
            <MetricTile label="Catálogos" value={String(groups.filter((group) => group.isValid).length)} hint="Preguntas o variables con opciones gobernadas." />
            <MetricTile label="Opciones" value={String(items.filter((item) => item.isValid).length)} hint="Valores disponibles para la UI y validación." />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-900/20 dark:text-white">
                <DatabaseZap className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Catálogos por dominio</CardTitle>
                <CardDescription>{activeDomain?.domainName ?? "Selecciona un dominio"}.</CardDescription>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[0.8fr_1fr]">
              <div className="space-y-2">
                <Label htmlFor="catalog-domain-filter">Dominio</Label>
                <select
                  id="catalog-domain-filter"
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                  value={domainFilter}
                  onChange={(event) => {
                    setDomainFilter(event.target.value);
                    setSelectedCatalogCode(null);
                  }}
                >
                  {domains.map((domain) => (
                    <option key={domain.domainCode} value={domain.domainCode}>{domain.domainName}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalog-search">Buscar catálogo</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="catalog-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nombre o descripción..." className="pl-10" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
              {filteredGroups.length ? filteredGroups.map((catalog) => {
                const isSelected = activeCatalogCode === catalog.catalogCode;
                return (
                  <button
                    key={catalog.catalogCode}
                    type="button"
                    onClick={() => openEditCatalog(catalog)}
                    className={cn(
                      "w-full rounded-[24px] border px-5 py-4 text-left transition-colors",
                      isSelected
                        ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                        : "border-border/70 bg-background/80 hover:border-slate-300 hover:bg-background",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{catalog.catalogName}</p>
                          <Badge variant={isSelected ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>
                            {catalog.isValid ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>
                        <p className={cn("text-xs", isSelected ? "text-white/80" : "text-muted-foreground")}>{catalog.catalogCode}</p>
                        <p className={cn("text-sm", isSelected ? "text-white/80" : "text-muted-foreground")}>{catalog.catalogDescription ?? "Sin descripción"}</p>
                      </div>
                      <PencilLine className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[24px] border border-dashed border-border/70 bg-background/80 px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay catálogos que coincidan con el filtro actual.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84 xl:sticky xl:top-4 xl:self-start">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full px-3 py-1">{editorMode === "edit" ? "Editar catálogo" : "Nuevo catálogo"}</Badge>
                  {activeCatalog ? <Badge variant="secondary" className="rounded-full px-3 py-1">{visibleItems.length} opciones</Badge> : null}
                </div>
                <div>
                  <CardTitle className="text-lg">{activeCatalog?.catalogName ?? "Registrar catálogo"}</CardTitle>
                  <CardDescription>Las opciones se usan en formularios y validaciones del dominio seleccionado.</CardDescription>
                </div>
              </div>
              <div className="rounded-full bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-900/20 dark:text-white">
                <DatabaseZap className="size-5" aria-hidden="true" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-5" onSubmit={saveCatalog}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="catalog-code">Código</Label>
                  <Input id="catalog-code" className="rounded-xl" value={groupForm.catalogCode} onChange={(event) => setGroupForm((current) => ({ ...current, catalogCode: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalog-domain">Dominio</Label>
                  <select id="catalog-domain" className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={groupForm.domainCode} onChange={(event) => setGroupForm((current) => ({ ...current, domainCode: event.target.value }))}>
                    {domains.map((domain) => <option key={domain.domainCode} value={domain.domainCode}>{domain.domainName}</option>)}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="catalog-name">Nombre</Label>
                  <Input id="catalog-name" className="rounded-xl" value={groupForm.catalogName} onChange={(event) => setGroupForm((current) => ({ ...current, catalogName: event.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="catalog-description">Descripción</Label>
                  <textarea id="catalog-description" rows={3} className="flex min-h-[96px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={groupForm.catalogDescription} onChange={(event) => setGroupForm((current) => ({ ...current, catalogDescription: event.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="rounded-full"><Save className="size-4" /> Guardar catálogo</Button>
              </div>
            </form>

            <form className="space-y-5 border-t border-border/70 pt-5" onSubmit={saveItem}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Opciones del catálogo</h3>
                  <p className="text-xs text-muted-foreground">Selecciona una opción para editarla o crea una nueva.</p>
                </div>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setItemForm(EMPTY_ITEM)}>Nueva opción</Button>
              </div>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_0.35fr]">
                <div className="space-y-2">
                  <Label htmlFor="item-code">Código</Label>
                  <Input id="item-code" className="rounded-xl" value={itemForm.itemCode} onChange={(event) => setItemForm((current) => ({ ...current, itemCode: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-label">Etiqueta</Label>
                  <Input id="item-label" className="rounded-xl" value={itemForm.itemLabelEs} onChange={(event) => setItemForm((current) => ({ ...current, itemLabelEs: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-order">Orden</Label>
                  <Input id="item-order" className="rounded-xl" value={itemForm.displayOrder} onChange={(event) => setItemForm((current) => ({ ...current, displayOrder: event.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="item-description">Descripción</Label>
                  <Input id="item-description" className="rounded-xl" value={itemForm.itemDescription} onChange={(event) => setItemForm((current) => ({ ...current, itemDescription: event.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="rounded-full" disabled={!activeCatalogCode}><Save className="size-4" /> Guardar opción</Button>
              </div>
            </form>

            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {visibleItems.length ? visibleItems.map((item) => (
                <button
                  key={`${item.catalogCode}:${item.itemCode}`}
                  type="button"
                  className="w-full rounded-[18px] border border-border/70 bg-background/80 px-4 py-3 text-left hover:border-slate-300"
                  onClick={() => setItemForm({
                    itemCode: item.itemCode,
                    itemLabelEs: item.itemLabelEs,
                    itemDescription: item.itemDescription ?? "",
                    displayOrder: String(item.displayOrder),
                    isValid: item.isValid,
                  })}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.itemLabelEs}</p>
                      <p className="text-xs text-muted-foreground">{item.displayOrder}. {item.itemCode}</p>
                    </div>
                    <Badge variant={item.isValid ? "success" : "outline"}>{item.isValid ? "Activo" : "Inactivo"}</Badge>
                  </div>
                </button>
              )) : (
                <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
                  Este catálogo todavía no tiene opciones.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
