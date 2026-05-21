"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Download, Plane, X } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/shared/ui/button";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { EmptyState } from "@/shared/data-display/empty-state";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { DateField, MultiSelectField } from "@/shared/filters";
import { fetchJson } from "@/lib/fetch-json";
import {
  formatDateSlash,
  formatDecimal,
  formatInteger,
  formatPercent,
} from "@/shared/lib/format";
import type {
  AlturasDronData,
  AlturasDronFilters,
} from "@/lib/campo-alturas-dron";
import { SearchInput } from "@/shared/forms/search-input";
import { AlturasDronBarCharts } from "./alturas-dron-bar-charts";
import { AlturasDronTable } from "./alturas-dron-table";
import { AlturasDronMulti } from "./alturas-dron-multi";
import { AlturasDronDistribution } from "./alturas-dron-distribution";

function buildQueryString(filters: AlturasDronFilters): string {
  const params = new URLSearchParams();
  params.set("dateFrom", filters.dateFrom);
  params.set("dateTo", filters.dateTo);
  if (filters.block) params.set("block", filters.block);
  if (filters.cycleKey) params.set("cycleKey", filters.cycleKey);
  if (filters.q) params.set("q", filters.q);
  return params.toString();
}

const fetcher = (url: string) =>
  fetchJson<AlturasDronData>(
    url,
    "No se pudo cargar los datos de alturas dron.",
  );

function defaultFilters(dateFrom: string, dateTo: string): AlturasDronFilters {
  return {
    dateFrom,
    dateTo,
    block: "",
    cycleKey: "",
    q: "",
  };
}

export function AlturasDronPage({ initialData }: { initialData: AlturasDronData }) {
  const [filters, setFilters] = useState<AlturasDronFilters>(initialData.filters);
  const [searchValue, setSearchValue] = useState(filters.q);
  const deferredFilters = useDeferredValue(filters);

  const initialKey = useMemo(
    () => buildQueryString(initialData.filters),
    [initialData.filters],
  );
  const currentKey = useMemo(() => buildQueryString(deferredFilters), [deferredFilters]);

  const { data } = useSWR<AlturasDronData>(
    `/api/campo/alturas-dron?${currentKey}`,
    fetcher,
    {
      fallbackData: currentKey === initialKey ? initialData : undefined,
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );

  const payload = data ?? initialData;
  const { summary, stats, ranges, options } = payload;

  const lastDateStats = stats.filter(
    (row) => row.eventDate === summary.lastDate,
  );

  function updateFilter<K extends keyof AlturasDronFilters>(
    key: K,
    value: AlturasDronFilters[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function handleReset() {
    const defaults = defaultFilters(payload.filters.dateFrom, payload.filters.dateTo);
    setFilters(defaults);
    setSearchValue("");
  }

  function handleExport() {
    const qs = buildQueryString(filters);
    window.location.href = `/api/campo/alturas-dron/export-xlsx?${qs}`;
  }

  const hasData = stats.length > 0;

  return (
    <div className="min-w-0 space-y-4">
      <SectionPageShell
        eyebrow="Analítica / Campo / Análisis"
        title="Alturas Dron (CHN)"
        subtitle="Altura normalizada del cultivo por bloque y fecha de monitoreo dron."
        icon={<Plane className="size-6" aria-hidden="true" />}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!hasData}
          >
            <Download className="mr-2 size-4" />
            XLSX
          </Button>
        }
      >
        <FilterPanel>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <DateField
              id="ad-from"
              label="Fecha desde"
              value={filters.dateFrom}
              onChange={(val) => updateFilter("dateFrom", val)}
            />
            <DateField
              id="ad-to"
              label="Fecha hasta"
              value={filters.dateTo}
              onChange={(val) => updateFilter("dateTo", val)}
            />
            <MultiSelectField
              id="ad-block"
              label="Bloque"
              value={filters.block}
              options={options.blocks}
              onChange={(val) => updateFilter("block", val)}
            />
            <MultiSelectField
              id="ad-cycle"
              label="Ciclo"
              value={filters.cycleKey}
              options={options.cycles}
              onChange={(val) => updateFilter("cycleKey", val)}
            />
            <SearchInput
              value={searchValue}
              onChange={(val: string) => {
                setSearchValue(val);
                updateFilter("q", val);
              }}
              placeholder="Buscar bloque..."
            />
            <Button variant="outline" onClick={handleReset}>
              <X className="mr-2 size-4" />
              Restablecer
            </Button>
          </div>

          <KpiGrid columns={4}>
            <MetricTile
              label="Fechas analizadas"
              value={formatInteger(summary.totalDates)}
              hint={
                summary.lastDate
                  ? `Últimas mediciones: ${formatDateSlash(summary.lastDate)}`
                  : undefined
              }
            />
            <MetricTile
              label="Bloques activos"
              value={formatInteger(summary.totalBlocks)}
              hint={`Periodo: ${formatDateSlash(filters.dateFrom)} a ${formatDateSlash(filters.dateTo)}`}
            />
            <MetricTile
              label="Altura promedio último día"
              value={
                summary.avgHeightLastDate !== null
                  ? `${formatDecimal(summary.avgHeightLastDate)} m`
                  : "—"
              }
              hint={
                summary.lastDate ? formatDateSlash(summary.lastDate) : undefined
              }
            />
            <MetricTile
              label="CV promedio último día"
              value={
                summary.avgCvLastDate !== null
                  ? formatPercent(summary.avgCvLastDate, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    })
                  : "—"
              }
              hint={`${summary.highCvBlockCount} bloque(s) con CV > 40%`}
              accent={
                summary.avgCvLastDate !== null
                  ? summary.avgCvLastDate >= 0.4
                    ? "danger"
                    : summary.avgCvLastDate >= 0.25
                      ? "warning"
                      : "success"
                  : "default"
              }
            />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      {!hasData ? (
        <EmptyState />
      ) : (
        <>
          <AlturasDronBarCharts statsLastDate={lastDateStats} />
          <AlturasDronTable
            rows={lastDateStats}
            searchValue={searchValue}
            onSearchChange={(val) => {
              setSearchValue(val);
              updateFilter("q", val);
            }}
          />
          <AlturasDronMulti stats={stats} />
          <AlturasDronDistribution ranges={ranges} blocks={options.blocks} />
        </>
      )}
    </div>
  );
}
