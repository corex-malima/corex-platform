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

type AdminDomain = { domainCode: string; domainName: string; domainDescription: string | null; displayOrder: number; isValid: boolean };
type AdminCatalogGroup = { catalogCode: string; catalogName: string; catalogDescription: string | null; domainCode: string; isSystemCatalog: boolean; validFrom: string; validTo: string | null };
type AdminCatalogItem = { catalogCode: string; itemCode: string; itemLabelEs: string; itemLabelEn: string | null; itemDescription: string | null; displayOrder: number; validFrom: string; validTo: string | null };
type CatalogPayload = { domains: AdminDomain[]; groups: AdminCatalogGroup[]; items: AdminCatalogItem[] };
type EditorMode = "create" | "edit";

const ENDPOINT = "/api/admin/administracion-maestros/catalogos";
const fetcher = (url: string) => fetchJson<CatalogPayload>(url, "No se pudo cargar catálogos.");
const EMPTY_GROUP = { catalogCode: "", catalogName: "", catalogDescription: "", domainCode: "", isSystemCatalog: false };
const EMPTY_ITEM = { itemCode: "", itemLabelEs: "", itemLabelEn: "", itemDescription: "", displayOrder: "0" };

export function AdminCatalogsPage() {
  const { data, mutate, isValidating } = useSWR(ENDPOINT, fetcher, { revalidateOnFocus: false });
  const [editorMode, setEditorMode] = useState<EditorMode>("create");
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState("");
  const [search, setSearch] = useState("");
  const [groupForm, setGroupForm] = useState(EMPTY_GROUP);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const deferredSearch = useDeferredValue(search);

  const domains = useMemo(() => data?.domains ?? [], [data?.domains]);
  const groups = useMemo(() => data?.groups ?? [], [data?.groups]);
  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const effectiveDomain = domainFilter || domains[0]?.domainCode || "";
  const activeCatalogCode = selectedCatalogCode ?? groups.find((g) => g.domainCode === effectiveDomain)?.catalogCode ?? groups[0]?.catalogCode ?? "";
  const activeCatalog = groups.find((g) => g.catalogCode === activeCatalogCode) ?? null;
  const activeDomain = domains.find((d) => d.domainCode === effectiveDomain) ?? null;
  const filteredGroups = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    return groups.filter((g) => {
      const sameDomain = !effectiveDomain || g.domainCode === effectiveDomain;
      const matchesSearch = !normalized || [g.catalogCode, g.catalogName, g.catalogDescription].some((v) => String(v ?? "").toLowerCase().includes(normalized));
      return sameDomain && matchesSearch;
    });
  }, [deferredSearch, effectiveDomain, groups]);
  const visibleItems = useMemo(() => items.filter((i) => i.catalogCode === activeCatalogCode), [activeCatalogCode, items]);

  function openCreateCatalog() {
    startTransition(() => {
      setEditorMode("create");
      setSelectedCatalogCode(null);
      setGroupForm({ ...EMPTY_GROUP, domainCode: effectiveDomain });
      setItemForm(EMPTY_ITEM);
    });
  }

  function openEditCatalog(catalog: AdminCatalogGroup) {
    startTransition(() => {
      setEditorMode("edit");
      setSelectedCatalogCode(catalog.catalogCode);
      setDomainFilter(catalog.domainCode);
      setGroupForm({
        catalogCode: catalog.catalogCode,
        catalogName: catalog.catalogName,
        catalogDescription: catalog.catalogDescription ?? "",
        domainCode: catalog.domainCode,
        isSystemCatalog: catalog.isSystemCatalog,
      });
      setItemForm(EMPTY_ITEM);
    });
  }

  async function post(body: Record<string, unknown>, success: string) {
    try {
      await fetchJson(ENDPOINT, "No se pudo guardar.", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      toast.success(success);
      await mutate(undefined, { revalidate: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al guardar.");
    }
  }

  async function saveCatalog(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupForm.catalogCode.trim() || !groupForm.catalogName.trim() || !groupForm.domainCode) {
      toast.error("Código, nombre y dominio son obligatorios.");
      return;
    }
    await post({
      kind: "group",
      catalogCode: groupForm.catalogCode.trim(),
      catalogName: groupForm.catalogName.trim(),
      catalogDescription: groupForm.catalogDescription.trim() || null,
      domainCode: groupForm.domainCode,
      isSystemCatalog: groupForm.isSystemCatalog,
    }, editorMode === "edit" ? "Catálogo actualizado." : "Catálogo creado.");
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
      catalogCode: activeCatalogCode,
      itemCode: itemForm.itemCode.trim(),
      itemLabelEs: itemForm.itemLabelEs.trim(),
      itemLabelEn: itemForm.itemLabelEn.trim() || null,
      itemDescription: itemForm.itemDescription.trim() || null,
      displayOrder: Number(itemForm.displayOrder) || 0,
    }, "Opción guardada.");
    setItemForm(EMPTY_ITEM);
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Administración / Administración Maestros / Catálogos"
        title="Catálogos"
        subtitle="Listas de opciones reutilizables: tipos de meta, operadores, direcciones de métricas, etc."
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
          <KpiGrid columns={3}>
            <MetricTile label="Dominios" value={String(domains.filter((d) => d.isValid).length)} hint="Agrupan catálogos por área." />
            <MetricTile label="Catálogos" value={String(groups.length)} hint="Listas de opciones gobernadas." />
            <MetricTile label="Opciones" value={String(items.length)} hint="Valores disponibles total." />
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
                <select id="catalog-domain-filter" className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={effectiveDomain} onChange={(e) => { setDomainFilter(e.target.value); setSelectedCatalogCode(null); }}>
                  {domains.map((d) => <option key={d.domainCode} value={d.domainCode}>{d.domainName}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="catalog-search">Buscar catálogo</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="catalog-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por código, nombre o descripción..." className="pl-10" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
              {filteredGroups.length ? filteredGroups.map((catalog) => {
                const isSelected = activeCatalogCode === catalog.catalogCode;
                const itemCount = items.filter((i) => i.catalogCode === catalog.catalogCode).length;
                return (
                  <button key={catalog.catalogCode} type="button" onClick={() => openEditCatalog(catalog)} className={cn("w-full rounded-[24px] border px-5 py-4 text-left transition-colors", isSelected ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20" : "border-border/70 bg-background/80 hover:border-slate-300 hover:bg-background")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{catalog.catalogName}</p>
                          <Badge variant={isSelected ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>{itemCount} opciones</Badge>
                          {catalog.isSystemCatalog ? <Badge variant="outline" className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>Sistema</Badge> : null}
                        </div>
                        <p className={cn("text-xs", isSelected ? "text-white/80" : "text-muted-foreground")}>{catalog.catalogCode}</p>
                        <p className={cn("text-sm", isSelected ? "text-white/80" : "text-muted-foreground")}>{catalog.catalogDescription ?? "Sin descripción"}</p>
                      </div>
                      <PencilLine className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[24px] border border-dashed border-border/70 bg-background/80 px-4 py-8 text-center text-sm text-muted-foreground">No hay catálogos que coincidan con el filtro actual.</div>
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
                  <CardDescription>Las opciones se usan en formularios y validaciones del dominio.</CardDescription>
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
                  <Input id="catalog-code" className="rounded-xl" value={groupForm.catalogCode} onChange={(e) => setGroupForm((c) => ({ ...c, catalogCode: e.target.value }))} disabled={editorMode === "edit"} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="catalog-domain">Dominio</Label>
                  <select id="catalog-domain" className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={groupForm.domainCode} onChange={(e) => setGroupForm((c) => ({ ...c, domainCode: e.target.value }))}>
                    <option value="">Selecciona un dominio</option>
                    {domains.map((d) => <option key={d.domainCode} value={d.domainCode}>{d.domainName}</option>)}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="catalog-name">Nombre</Label>
                  <Input id="catalog-name" className="rounded-xl" value={groupForm.catalogName} onChange={(e) => setGroupForm((c) => ({ ...c, catalogName: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="catalog-description">Descripción</Label>
                  <textarea id="catalog-description" rows={3} className="flex min-h-[96px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={groupForm.catalogDescription} onChange={(e) => setGroupForm((c) => ({ ...c, catalogDescription: e.target.value }))} />
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
                  <Input id="item-code" className="rounded-xl" value={itemForm.itemCode} onChange={(e) => setItemForm((c) => ({ ...c, itemCode: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-label">Etiqueta (ES)</Label>
                  <Input id="item-label" className="rounded-xl" value={itemForm.itemLabelEs} onChange={(e) => setItemForm((c) => ({ ...c, itemLabelEs: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-order">Orden</Label>
                  <Input id="item-order" type="number" className="rounded-xl" value={itemForm.displayOrder} onChange={(e) => setItemForm((c) => ({ ...c, displayOrder: e.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label htmlFor="item-description">Descripción</Label>
                  <Input id="item-description" className="rounded-xl" value={itemForm.itemDescription} onChange={(e) => setItemForm((c) => ({ ...c, itemDescription: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="rounded-full" disabled={!activeCatalogCode}><Save className="size-4" /> Guardar opción</Button>
              </div>
            </form>

            <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
              {visibleItems.length ? visibleItems.map((item) => (
                <button key={`${item.catalogCode}:${item.itemCode}`} type="button" className="w-full rounded-[18px] border border-border/70 bg-background/80 px-4 py-3 text-left hover:border-slate-300" onClick={() => setItemForm({ itemCode: item.itemCode, itemLabelEs: item.itemLabelEs, itemLabelEn: item.itemLabelEn ?? "", itemDescription: item.itemDescription ?? "", displayOrder: String(item.displayOrder) })}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{item.itemLabelEs}</p>
                      <p className="text-xs text-muted-foreground">{item.displayOrder}. {item.itemCode}</p>
                    </div>
                    <Badge variant="outline">{item.itemCode}</Badge>
                  </div>
                </button>
              )) : (
                <div className="rounded-[18px] border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">Este catálogo todavía no tiene opciones.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
