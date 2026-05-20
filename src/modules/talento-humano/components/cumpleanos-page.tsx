"use client";

import { useMemo, useState } from "react";
import { Cake, Download, X } from "lucide-react";
import useSWR from "swr";

import { fetchJson } from "@/lib/fetch-json";
import type {
  CumpleanosData,
  CumpleanosFilters,
} from "@/lib/talento-humano-cumpleanos";

type OptionEntry = { id: string; name: string };
import { CumpleanosTable } from "@/modules/talento-humano/components/cumpleanos-table";
import { EmptyState } from "@/shared/data-display/empty-state";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { DateField, MultiSelectField, ToggleChipGroup } from "@/shared/filters";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { formatDateSlash, formatInteger } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

const MONTH_CHIPS = [
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

function cumpleanosFetcher(url: string) {
  return fetchJson<CumpleanosData>(url, "No se pudo cargar los cumpleaños.");
}

function buildQuery(filters: CumpleanosFilters): string {
  const params = new URLSearchParams();
  params.set("corteDate", filters.corteDate);
  if (filters.months && filters.months !== "all") params.set("months", filters.months);
  if (filters.areaGeneral && filters.areaGeneral !== "all") params.set("areaGeneral", filters.areaGeneral);
  if (filters.jobClassification && filters.jobClassification !== "all") {
    params.set("jobClassification", filters.jobClassification);
  }
  if (filters.farmCode && filters.farmCode !== "all") params.set("farmCode", filters.farmCode);
  if (filters.jobTitle && filters.jobTitle !== "all") params.set("jobTitle", filters.jobTitle);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

function decodeMonths(encoded: string): string[] {
  if (encoded === "all" || !encoded) return [];
  return encoded.split(",");
}

function encodeMonths(arr: string[]): string {
  if (arr.length === 0 || arr.length === 12) return "all";
  return arr.join(",");
}

function defaultFilters(corteDate: string): CumpleanosFilters {
  const currentMonth = String(new Date().getMonth() + 1);
  return {
    corteDate,
    months: currentMonth,
    areaGeneral: "all",
    jobClassification: "all",
    farmCode: "all",
    jobTitle: "all",
    q: "",
  };
}

export function CumpleanosPage({ initialData }: { initialData: CumpleanosData }) {
  const [filters, setFilters] = useState<CumpleanosFilters>(initialData.filters);
  const selectedMonths = useMemo(() => decodeMonths(filters.months), [filters.months]);

  const query = buildQuery(filters);
  const url = `/api/talento-humano/cumpleanos?${query}`;

  const { data, error, isValidating, mutate } = useSWR<CumpleanosData>(url, cumpleanosFetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    keepPreviousData: true,
    dedupingInterval: 30_000,
  });

  const payload = data ?? initialData;
  const rows = payload.rows;
  const summary = payload.summary;

  const updateFilter = <K extends keyof CumpleanosFilters>(key: K, value: CumpleanosFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleMonthsChange = (selected: string[]) => {
    updateFilter("months", encodeMonths(selected));
  };

  const handleReset = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFilters(defaultFilters(today));
  };

  const handleExport = () => {
    window.location.href = `/api/talento-humano/cumpleanos/export-xlsx?${query}`;
  };

  const handleSearchChange = (value: string) => {
    updateFilter("q", value);
  };

  const areaGeneralList = useMemo(() => {
    const list = payload.options?.areaGenerals ?? [];
    return Array.isArray(list) ? list : [];
  }, [payload.options?.areaGenerals]);

  const classificationsList = useMemo(
    () => payload.options?.jobClassifications ?? [],
    [payload.options?.jobClassifications],
  );

  const farmsList = useMemo(() => {
    const list = payload.options?.farmCodes ?? [];
    return Array.isArray(list) ? list : [];
  }, [payload.options?.farmCodes]);

  const jobTitlesList = useMemo(() => {
    const list = payload.options?.jobTitles ?? [];
    return Array.isArray(list) ? list : [];
  }, [payload.options?.jobTitles]);

  const areaGeneralOptions = useMemo(() => {
    return areaGeneralList
      .map((e: unknown) => {
        if (typeof e === "object" && e != null && "id" in e) {
          return (e as OptionEntry).id;
        }
        return e as string;
      })
      .filter((v: string) => Boolean(v));
  }, [areaGeneralList]);

  const areaGeneralLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of areaGeneralList) {
      if (typeof entry === "object" && entry != null && "id" in entry && "name" in entry) {
        const e = entry as OptionEntry;
        map.set(e.id, e.name);
      }
    }
    return map;
  }, [areaGeneralList]);

  const farmOptions = useMemo(() => {
    return farmsList
      .map((e: unknown) => {
        if (typeof e === "object" && e != null && "id" in e) {
          return (e as OptionEntry).id;
        }
        return e as string;
      })
      .filter((v: string) => Boolean(v));
  }, [farmsList]);

  const farmLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of farmsList) {
      if (typeof entry === "object" && entry != null && "id" in entry && "name" in entry) {
        const e = entry as OptionEntry;
        map.set(e.id, e.name);
      }
    }
    return map;
  }, [farmsList]);

  const jobTitleOptions = useMemo(() => {
    return jobTitlesList
      .map((e: unknown) => {
        if (typeof e === "object" && e != null && "id" in e) {
          return (e as OptionEntry).id;
        }
        return e as string;
      })
      .filter((v: string) => Boolean(v));
  }, [jobTitlesList]);

  const jobTitleLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of jobTitlesList) {
      if (typeof entry === "object" && entry != null && "id" in entry && "name" in entry) {
        const e = entry as OptionEntry;
        map.set(e.id, e.name);
      }
    }
    return map;
  }, [jobTitlesList]);

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow="Analítica / Talento Humano / Explorador"
        title="Cumpleaños"
        subtitle="Colaboradores activos al corte, ordenados por mes y día de cumpleaños."
        icon={<Cake className="size-6" aria-hidden="true" />}
        actions={(
          <Button type="button" variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" aria-hidden="true" />
            Exportar
          </Button>
        )}
      >
        <FilterPanel>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Mes</span>
            <ToggleChipGroup
              options={MONTH_CHIPS}
              selected={selectedMonths}
              onChange={handleMonthsChange}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <DateField
              id="cum-corte"
              label="Fecha de corte"
              value={filters.corteDate}
              onChange={(value) => updateFilter("corteDate", value)}
            />
            <MultiSelectField
              id="cum-area-general"
              label="Área Original"
              value={filters.areaGeneral}
              options={areaGeneralOptions}
              displayValue={(id) => areaGeneralLabelMap.get(id) ?? id}
              onChange={(value) => updateFilter("areaGeneral", value)}
            />
            <MultiSelectField
              id="cum-clasif"
              label="Clasificación Trabajo"
              value={filters.jobClassification}
              options={classificationsList}
              onChange={(value) => updateFilter("jobClassification", value)}
            />
            <MultiSelectField
              id="cum-farm"
              label="Finca"
              value={filters.farmCode}
              options={farmOptions}
              displayValue={(id) => farmLabelMap.get(id) ?? id}
              onChange={(value) => updateFilter("farmCode", value)}
            />
            <MultiSelectField
              id="cum-cargo"
              label="Cargo Actual"
              value={filters.jobTitle}
              options={jobTitleOptions}
              displayValue={(id) => jobTitleLabelMap.get(id) ?? id}
              onChange={(value) => updateFilter("jobTitle", value)}
            />
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleReset}
                aria-label="Restablecer filtros"
              >
                <X className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>

          <KpiGrid columns={4}>
            <MetricTile
              label="Total colaboradores"
              value={formatInteger(summary.totalCollaborators)}
              hint={`Activos al ${formatDateSlash(payload.corteDate)}`}
            />
            <MetricTile
              label="Cumplen este mes"
              value={formatInteger(summary.upcomingThisMonth)}
              accent="success"
            />
            <MetricTile
              label="Próximos 30 días"
              value={formatInteger(summary.upcomingNext30Days)}
              accent="warning"
            />
            <MetricTile
              label="Mes(es) filtrado(s)"
              value={selectedMonths.length === 0 ? "Todos" : `${selectedMonths.length}/12`}
            />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      {error ? (
        <Card className="border-amber-300/60 bg-amber-500/10">
          <CardContent className="px-4 py-3 text-sm">
            <p className="font-medium">No se pudo cargar los cumpleaños.</p>
            <p className="opacity-90">{error instanceof Error ? error.message : "Error desconocido."}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => mutate()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState label="Sin colaboradores que coincidan con los filtros." />
      ) : (
        <CumpleanosTable
          rows={rows}
          searchValue={filters.q}
          onSearchChange={handleSearchChange}
          isValidating={isValidating}
        />
      )}
    </div>
  );
}
