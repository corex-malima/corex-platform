"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Download, Plane, X } from "lucide-react";
import useSWR from "swr";

import { fetchJson } from "@/lib/fetch-json";
import type {
  AlturasDronData,
  AlturasDronFilters,
} from "@/lib/campo-alturas-dron";

import { Button } from "@/shared/ui/button";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { EmptyState } from "@/shared/data-display/empty-state";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { DateField, MultiSelectField } from "@/shared/filters";
import { SearchInput } from "@/shared/forms/search-input";
import {
  formatDateSlash,
  formatDecimal,
  formatInteger,
  formatPercent,
} from "@/shared/lib/format";

import { AlturasDronHistogramScrubber } from "./alturas-dron-histogram-scrubber";
import { AlturasDronCentralEvolution } from "./alturas-dron-central-evolution";
import { AlturasDronCvHeatmap } from "./alturas-dron-cv-heatmap";
import { AlturasDronStatsTable } from "./alturas-dron-stats-table";
import { AlturasDronVariabilityCharts } from "./alturas-dron-variability-charts";

function buildQueryString(filters: AlturasDronFilters): string {
  const params = new URLSearchParams();
  params.set("dateFrom", filters.dateFrom);
  params.set("dateTo", filters.dateTo);
  if (filters.block) params.set("block", filters.block);
  if (filters.variety) params.set("variety", filters.variety);
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
    block: "all",
    variety: "all",
    q: "",
  };
}

export function AlturasDronPage({ initialData }: { initialData: AlturasDronData }) {
  const [filters, setFilters] = useState<AlturasDronFilters>(initialData.filters);
  const [searchValue, setSearchValue] = useState(filters.q);
  const [selectedBlock, setSelectedBlock] = useState<string | undefined>(undefined);
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

  const lastDateStats = useMemo(() => {
    if (!summary.lastDate) return [];
    return stats.filter((row) => row.eventDate === summary.lastDate);
  }, [stats, summary.lastDate]);

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
    setSelectedBlock(undefined);
  }

  function handleExport() {
    const qs = buildQueryString(filters);
    window.location.href = `/api/campo/alturas-dron/export-xlsx?${qs}`;
  }

  function handleHeatmapCellClick(parentBlock: string) {
    setSelectedBlock(parentBlock);
    document.getElementById("alturas-dron-histogram")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const hasData = stats.length > 0;

  return (
    <div className="min-w-0 space-y-4">
      <SectionPageShell
        eyebrow="Analítica / Campo / Indicadores & KPI"
        title="Alturas Dron"
        subtitle="Histograma de alturas, evolución temporal, heterogeneidad y métricas estadísticas por bloque."
        icon={<Plane className="size-6" />}
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
              id="ad-variety"
              label="Variedad"
              value={filters.variety}
              options={options.varieties}
              onChange={(val) => updateFilter("variety", val)}
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
              label="Bloques medidos"
              value={formatInteger(summary.totalBlocks)}
              hint={
                summary.lastDate
                  ? `Último día: ${formatDateSlash(summary.lastDate)}`
                  : undefined
              }
            />
            <MetricTile
              label="Altura promedio último día"
              value={
                summary.avgMeanLastDate !== null
                  ? `${formatDecimal(summary.avgMeanLastDate)} m`
                  : "—"
              }
              hint="E[x] medio"
            />
            <MetricTile
              label="CV promedio último día"
              value={
                summary.avgCvLastDate !== null
                  ? formatPercent(summary.avgCvLastDate, {
                      input: "ratio",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    })
                  : "—"
              }
              hint={`${summary.highCvBlockCount} bloque(s) > 40%`}
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
            <MetricTile
              label="Gini promedio último día"
              value={
                summary.avgGiniLastDate !== null
                  ? formatDecimal(summary.avgGiniLastDate)
                  : "—"
              }
              hint="Desigualdad interna"
            />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      {!hasData ? (
        <EmptyState label="Sin mediciones de dron para los filtros aplicados." />
      ) : (
        <>
          <div id="alturas-dron-histogram">
            <AlturasDronHistogramScrubber
              stats={stats}
              ranges={ranges}
              initialBlock={selectedBlock}
            />
          </div>
          <AlturasDronCentralEvolution stats={stats} selectedBlock={selectedBlock} />
          <AlturasDronCvHeatmap stats={stats} onCellClick={handleHeatmapCellClick} />
          <AlturasDronStatsTable stats={stats} />
          <AlturasDronVariabilityCharts stats={lastDateStats} />
        </>
      )}
    </div>
  );
}
