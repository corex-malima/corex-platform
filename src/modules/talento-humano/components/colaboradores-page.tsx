"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, LoaderCircle, UsersRound, X } from "lucide-react";
import useSWR from "swr";

import { canAccessResource } from "@/lib/access-control";
import { fetchJson } from "@/lib/fetch-json";
import type {
  CollaboratorDetailPayload,
  CollaboratorSearchRow,
} from "@/lib/talento-humano-colaboradores";
import { useCurrentUserAccess } from "@/hooks/use-current-user-access";
import {
  HeaderCard,
  TabContent,
  initials,
  type CollaboratorTabKey,
} from "@/modules/talento-humano/components/colaboradores-sections";
import { EmptyState } from "@/shared/data-display/empty-state";
import { SearchInput } from "@/shared/forms/search-input";
import { FilterPanel } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { formatInteger } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

const TAB_LABELS: Record<CollaboratorTabKey, string> = {
  basic: "Información básica",
  performance: "Rendimientos",
  medical: "Ficha médica",
  absenteeism: "Ausentismo",
  exits: "Salidas",
  followups: "Seguimientos",
};

const TAB_PERMISSION: Partial<Record<CollaboratorTabKey, string>> = {
  basic: "panel:tthh.collaborators.basic",
  performance: "panel:tthh.collaborators.performance",
  medical: "panel:tthh.collaborators.medical",
  absenteeism: "panel:tthh.collaborators.absenteeism",
  exits: "panel:tthh.collaborators.exits",
  followups: "panel:tthh.collaborators.followups",
};

function searchFetcher(url: string) {
  return fetchJson<{ results: CollaboratorSearchRow[] }>(
    url,
    "No se pudo buscar colaboradores.",
  );
}

function detailFetcher(url: string) {
  return fetchJson<CollaboratorDetailPayload>(url, "No se pudo cargar el colaborador.");
}

function hasPermission(
  resource: string | undefined,
  allowedResources: string[],
  isSuperadmin: boolean,
) {
  return !resource || canAccessResource(resource, allowedResources, isSuperadmin);
}

function buildSearchUrl(query: string) {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("area", "all");
  params.set("status", "all");
  return `/api/talento-humano/colaboradores/search?${params.toString()}`;
}

export function TalentoColaboradoresPage() {
  const { data: access } = useCurrentUserAccess();
  const allowedResources = access?.allowedResources ?? [];
  const isSuperadmin = access?.isSuperadmin ?? false;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<CollaboratorSearchRow | null>(null);
  const [tab, setTab] = useState<CollaboratorTabKey>("basic");

  // Debounce manual del query para evitar 1 fetch por keystroke.
  useEffect(() => {
    const handle = window.setTimeout(() => setDebouncedQuery(query), 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  const visibleTabs = (Object.keys(TAB_LABELS) as CollaboratorTabKey[]).filter((key) =>
    hasPermission(TAB_PERMISSION[key], allowedResources, isSuperadmin),
  );
  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0] ?? "basic";

  const trimmedQuery = debouncedQuery.trim();
  const searchUrl = trimmedQuery.length >= 2 ? buildSearchUrl(trimmedQuery) : null;
  const {
    data: searchData,
    isLoading: searching,
    error: searchError,
    mutate: revalidateSearch,
  } = useSWR(searchUrl, searchFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10_000,
  });
  const rows = useMemo(() => searchData?.results ?? [], [searchData?.results]);

  const detailUrl = selected
    ? `/api/talento-humano/colaboradores/${encodeURIComponent(selected.personId)}`
    : null;
  const {
    data: detail,
    isLoading: loadingDetail,
    error: detailError,
    mutate: revalidateDetail,
  } = useSWR(detailUrl, detailFetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  const handleReset = () => {
    setQuery("");
    setDebouncedQuery("");
    setSelected(null);
  };

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Analítica / Talento Humano / Explorador"
        title="Colaboradores"
        subtitle="Explorador integral por colaborador con permisos granulares por sección y dato sensible."
        icon={<UsersRound className="size-6" aria-hidden="true" />}
      >
        <FilterPanel>
          <div className="grid gap-3 lg:grid-cols-[minmax(320px,1fr)_auto]">
            <SearchControl
              query={query}
              rows={rows}
              searching={searching}
              hasResults={Boolean(searchData)}
              selectedPersonId={selected?.personId}
              onQueryChange={(value) => {
                setQuery(value);
                if (selected && value.trim() !== selected.personName.trim()) {
                  setSelected(null);
                }
              }}
              onSelect={(row) => {
                setSelected(row);
                setQuery(row.personName);
                setDebouncedQuery(row.personName);
                setTab("basic");
              }}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full lg:w-auto"
                onClick={handleReset}
                disabled={query === "" && !selected}
                aria-label="Restablecer búsqueda"
              >
                <X className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>
          {searchError ? (
            <ErrorBanner
              title="No se pudo buscar"
              message={searchError instanceof Error ? searchError.message : "Error desconocido"}
              onRetry={() => revalidateSearch()}
            />
          ) : null}
        </FilterPanel>
      </SectionPageShell>

      <div className="min-w-0 space-y-4">
        {!selected ? (
          <EmptyState label="Busque por nombre, código o cédula y seleccione un colaborador." />
        ) : detailError ? (
          <ErrorBanner
            title="No se pudo cargar la ficha del colaborador"
            message={detailError instanceof Error ? detailError.message : "Error desconocido"}
            onRetry={() => revalidateDetail()}
          />
        ) : loadingDetail ? (
          <LoadingLine label="Cargando ficha del colaborador." />
        ) : detail ? (
          <>
            <HeaderCard detail={detail} />
            <div
              role="tablist"
              aria-label="Secciones del colaborador"
              className="flex flex-wrap gap-2 rounded-[22px] border border-border/60 bg-card/80 p-2"
            >
              {visibleTabs.map((key) => (
                <Button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === key}
                  variant={activeTab === key ? "default" : "ghost"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => setTab(key)}
                >
                  {TAB_LABELS[key]}
                </Button>
              ))}
            </div>
            <TabContent tab={activeTab} detail={detail} />
          </>
        ) : (
          <EmptyState label="No se pudo cargar este colaborador." />
        )}
      </div>
    </div>
  );
}

function SearchControl({
  query,
  rows,
  searching,
  hasResults,
  selectedPersonId,
  onQueryChange,
  onSelect,
}: {
  query: string;
  rows: CollaboratorSearchRow[];
  searching: boolean;
  hasResults: boolean;
  selectedPersonId?: string;
  onQueryChange: (value: string) => void;
  onSelect: (row: CollaboratorSearchRow) => void;
}) {
  const showDropdown = query.trim().length >= 2 && selectedPersonId === undefined;

  return (
    <div className="relative space-y-2">
      <label
        htmlFor="colaboradores-search"
        className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        Buscar colaborador
      </label>
      <SearchInput
        id="colaboradores-search"
        value={query}
        onChange={onQueryChange}
        placeholder="Nombre, código o cédula..."
        ariaLabel="Buscar colaborador por nombre, código o cédula"
      />
      <p className="text-xs text-muted-foreground">Ej.: Rivera Erick, 2816 o 010...</p>
      {showDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-[var(--shadow-dropdown)]">
          <div className="border-b border-border/50 px-4 py-3 text-xs text-muted-foreground">
            {searching
              ? "Buscando..."
              : `${formatInteger(rows.length)} coincidencia(s)`}
          </div>
          <div className="max-h-[360px] overflow-y-auto p-2">
            {searching ? <LoadingLine label="Buscando colaboradores." /> : null}
            {!searching && hasResults && rows.length === 0 ? (
              <EmptyState label="Sin coincidencias." />
            ) : null}
            {rows.map((row) => (
              <ResultOption key={row.personId} row={row} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResultOption({
  row,
  onSelect,
}: {
  row: CollaboratorSearchRow;
  onSelect: (row: CollaboratorSearchRow) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className="w-full rounded-[18px] border border-transparent px-4 py-3 text-left transition hover:border-primary/30 hover:bg-muted/40"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold text-foreground">
          {initials(row.personName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{row.personName}</p>
            <Badge variant={row.isActive ? "success" : "danger"}>
              {row.isActive ? "Activo" : "Pasivo"}
            </Badge>
          </div>
          <p className="mt-1 text-xs opacity-75">
            ID {row.personId} · {row.nationalId ?? "sin cédula"}
          </p>
          <p className="mt-1 truncate text-xs opacity-75">
            {row.areaName ?? row.areaId ?? "Sin área"} · {row.jobTitle ?? "Sin cargo"}
          </p>
        </div>
      </div>
    </button>
  );
}

function LoadingLine({ label }: { label: string }) {
  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="flex items-center gap-3 px-4 py-4 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        {label}
      </CardContent>
    </Card>
  );
}

function ErrorBanner({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[24px] border border-amber-300/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          <p className="mt-1 opacity-90">{message}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
