"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";
import { Blocks, PencilLine, Plus, RefreshCcw, Save, Search } from "lucide-react";
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
type CatalogPayload = { domains: CatalogDomain[]; groups: CatalogGroup[] };

const EMPTY_DOMAIN = {
  domainCode: "",
  domainName: "",
  domainDescription: "",
  moduleCode: "tthh",
  displayOrder: "0",
  isValid: true,
};

const fetcher = (url: string) => fetchJson<CatalogPayload>(url, "No se pudo cargar dominios TTHH.");

export function TthhDomainsAdminPage() {
  const { data, mutate, isValidating } = useSWR("/api/talento-humano/catalogos", fetcher, { revalidateOnFocus: false });
  const [selectedDomainCode, setSelectedDomainCode] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formValues, setFormValues] = useState(EMPTY_DOMAIN);
  const deferredSearch = useDeferredValue(search);

  const domains = useMemo(() => data?.domains ?? [], [data?.domains]);
  const groups = useMemo(() => data?.groups ?? [], [data?.groups]);
  const selectedDomain = selectedDomainCode ? domains.find((domain) => domain.domainCode === selectedDomainCode) ?? null : null;
  const filteredDomains = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) return domains;
    return domains.filter((domain) => [domain.domainCode, domain.domainName, domain.domainDescription]
      .some((value) => String(value ?? "").toLowerCase().includes(normalized)));
  }, [deferredSearch, domains]);

  function openCreateMode() {
    startTransition(() => {
      setSelectedDomainCode(null);
      setFormValues(EMPTY_DOMAIN);
    });
  }

  function openEditMode(domain: CatalogDomain) {
    startTransition(() => {
      setSelectedDomainCode(domain.domainCode);
      setFormValues({
        domainCode: domain.domainCode,
        domainName: domain.domainName,
        domainDescription: domain.domainDescription ?? "",
        moduleCode: domain.moduleCode,
        displayOrder: String(domain.displayOrder),
        isValid: domain.isValid,
      });
    });
  }

  async function saveDomain(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValues.domainCode.trim() || !formValues.domainName.trim()) {
      toast.error("Código y nombre del dominio son obligatorios.");
      return;
    }

    try {
      await fetchJson("/api/talento-humano/catalogos", "No se pudo guardar el dominio.", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "domain",
          action: "upsert",
          ...formValues,
          displayOrder: Number(formValues.displayOrder) || 0,
        }),
      });
      toast.success(selectedDomain ? "Dominio actualizado." : "Dominio creado.");
      setSelectedDomainCode(formValues.domainCode.trim());
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el dominio.");
    }
  }

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Administración / Maestros por dominio / Talento Humano / Dominios"
        title="Dominios TTHH"
        subtitle="Agrupa catálogos por formulario o proceso. Ejemplo: Seguimiento Trabajo Social."
        icon={<Blocks className="size-5" aria-hidden="true" />}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => void mutate()}>
              <RefreshCcw className={cn("size-4", isValidating && "animate-spin")} />
              Recargar
            </Button>
            <Button type="button" className="rounded-full" onClick={openCreateMode}>
              <Plus className="size-4" />
              Nuevo dominio
            </Button>
          </div>
        )}
      >
        <FilterPanel>
          <KpiGrid>
            <MetricTile label="Dominios activos" value={String(domains.filter((domain) => domain.isValid).length)} hint="Formularios o procesos con catálogos gobernados." />
            <MetricTile label="Catálogos asignados" value={String(groups.length)} hint="Catálogos vinculados a dominios TTHH." />
            <MetricTile label="Dominio seleccionado" value={selectedDomain?.domainName ?? "-"} hint="Base para crear o editar catálogos." />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="starter-panel border-border/70 bg-card/84">
          <CardHeader className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-slate-900/10 p-3 text-slate-700 dark:bg-slate-900/20 dark:text-white">
                <Blocks className="size-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg">Listado de dominios</CardTitle>
                <CardDescription>Selecciona un dominio para editarlo o crea uno nuevo.</CardDescription>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain-search">Buscar dominio</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="domain-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, nombre o descripción..." className="pl-10" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <div className="max-h-[calc(100dvh-16rem)] space-y-3 overflow-y-auto pr-1">
              {filteredDomains.length ? filteredDomains.map((domain) => {
                const isSelected = selectedDomainCode === domain.domainCode;
                const catalogCount = groups.filter((group) => group.domainCode === domain.domainCode).length;
                return (
                  <button
                    key={domain.domainCode}
                    type="button"
                    onClick={() => openEditMode(domain)}
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
                          <p className="text-base font-semibold">{domain.domainName}</p>
                          <Badge variant={isSelected ? "secondary" : "outline"} className={cn("rounded-full px-3 py-1", isSelected && "border-white/20 bg-white/12 text-white")}>
                            {catalogCount} catálogos
                          </Badge>
                        </div>
                        <p className={cn("text-xs", isSelected ? "text-white/80" : "text-muted-foreground")}>{domain.domainCode}</p>
                        <p className={cn("text-sm", isSelected ? "text-white/80" : "text-muted-foreground")}>{domain.domainDescription ?? "Sin descripción"}</p>
                      </div>
                      <PencilLine className={cn("size-4 shrink-0", isSelected ? "text-white" : "text-muted-foreground")} />
                    </div>
                  </button>
                );
              }) : (
                <div className="rounded-[24px] border border-dashed border-border/70 bg-background/80 px-4 py-8 text-center text-sm text-muted-foreground">
                  No hay dominios que coincidan con el filtro actual.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="starter-panel border-border/70 bg-card/84 xl:sticky xl:top-4 xl:self-start">
          <CardHeader>
            <CardTitle className="text-lg">{selectedDomain ? selectedDomain.domainName : "Registrar dominio"}</CardTitle>
            <CardDescription>Un dominio representa un formulario o proceso con catálogos propios.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={saveDomain}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="domain-code">Código</Label>
                  <Input id="domain-code" className="rounded-xl" value={formValues.domainCode} onChange={(event) => setFormValues((current) => ({ ...current, domainCode: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain-module">Módulo</Label>
                  <Input id="domain-module" className="rounded-xl" value={formValues.moduleCode} onChange={(event) => setFormValues((current) => ({ ...current, moduleCode: event.target.value }))} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="domain-name">Nombre</Label>
                  <Input id="domain-name" className="rounded-xl" value={formValues.domainName} onChange={(event) => setFormValues((current) => ({ ...current, domainName: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain-order">Orden visual</Label>
                  <Input id="domain-order" className="rounded-xl" value={formValues.displayOrder} onChange={(event) => setFormValues((current) => ({ ...current, displayOrder: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain-status">Estado</Label>
                  <select id="domain-status" className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={formValues.isValid ? "active" : "inactive"} onChange={(event) => setFormValues((current) => ({ ...current, isValid: event.target.value === "active" }))}>
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="domain-description">Descripción</Label>
                  <textarea id="domain-description" rows={4} className="flex min-h-[112px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" value={formValues.domainDescription} onChange={(event) => setFormValues((current) => ({ ...current, domainDescription: event.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" className="rounded-full"><Save className="size-4" /> Guardar dominio</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
