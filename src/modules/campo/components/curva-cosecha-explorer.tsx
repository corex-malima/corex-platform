"use client";

import { useDeferredValue, useMemo, useState } from "react";
import useSWR from "swr";
import { LineChart as LineChartIcon, RefreshCcw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { ChartSection, DetailSection, FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState } from "@/shared/data-display/empty-state";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { MultiSelectField } from "@/shared/filters/multi-select-field";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { fetchJson } from "@/lib/fetch-json";
import {
  formatDate,
  formatDecimal,
  formatInteger,
  formatMonthNumeric,
} from "@/shared/lib/format";
import type {
  CurvaCosechaFilters,
  CurvaCosechaPayload,
} from "@/lib/campo-curva-cosecha";
import { BlockProfileModal } from "@/modules/fenograma/components/block-profile-modal";
import { useBlockProfileModal } from "@/hooks/use-block-profile-modal";
import type { BlockModalRow } from "@/lib/fenograma";
import { AggregatedHarvestCurvePanel } from "./aggregated-harvest-curve-panel";

const ALL_FILTERS_DEFAULT: CurvaCosechaFilters = {
  year: "all",
  month: "all",
  variety: "all",
  spType: "all",
  area: "all",
};

function buildQueryString(filters: CurvaCosechaFilters) {
  const params = new URLSearchParams();
  params.set("year", filters.year);
  params.set("month", filters.month);
  params.set("variety", filters.variety);
  params.set("spType", filters.spType);
  params.set("area", filters.area);
  return params.toString();
}

const fetcher = (url: string) =>
  fetchJson<CurvaCosechaPayload>(
    url,
    "No se pudo cargar la curva de cosecha agregada.",
  );

export function CurvaCosechaExplorer({ initialData }: { initialData: CurvaCosechaPayload }) {
  const [filters, setFilters] = useState<CurvaCosechaFilters>(initialData.filters);
  const [selectedRow, setSelectedRow] = useState<BlockModalRow | null>(null);
  const blockModal = useBlockProfileModal(selectedRow);
  const deferredFilters = useDeferredValue(filters);

  const initialKey = useMemo(() => buildQueryString(initialData.filters), [initialData.filters]);
  const currentKey = useMemo(() => buildQueryString(deferredFilters), [deferredFilters]);

  const { data, error, isValidating } = useSWR<CurvaCosechaPayload>(
    `/api/curva-cosecha?${currentKey}`,
    fetcher,
    {
      fallbackData: currentKey === initialKey ? initialData : undefined,
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
    },
  );

  const payload = data ?? initialData;

  function updateFilter<K extends keyof CurvaCosechaFilters>(key: K, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(ALL_FILTERS_DEFAULT);
  }

  const hasData = payload.summary.cycleCount > 0;

  return (
    <div className="min-w-0 space-y-4">
      <SectionPageShell
        eyebrow="Analítica / Campo / Indicadores & KPI"
        title="Curva de Cosecha"
        subtitle="Curva agregada por día relativo al inicio de cosecha y período vegetativo a través de múltiples ciclos."
        icon={<LineChartIcon className="size-6" aria-hidden="true" />}
      >
        <FilterPanel>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MultiSelectField
              id="cc-year"
              label="Año cierre cosecha"
              value={filters.year}
              options={payload.options.years}
              onChange={(value) => updateFilter("year", value)}
            />
            <MultiSelectField
              id="cc-month"
              label="Mes cierre cosecha"
              value={filters.month}
              options={payload.options.months}
              onChange={(value) => updateFilter("month", value)}
              displayValue={formatMonthNumeric}
            />
            <MultiSelectField
              id="cc-variety"
              label="Variedad"
              value={filters.variety}
              options={payload.options.varieties}
              onChange={(value) => updateFilter("variety", value)}
            />
            <MultiSelectField
              id="cc-sp-type"
              label="Tipo SP"
              value={filters.spType}
              options={payload.options.spTypes}
              onChange={(value) => updateFilter("spType", value)}
            />
            <MultiSelectField
              id="cc-area"
              label="Área"
              value={filters.area}
              options={payload.options.areas}
              onChange={(value) => updateFilter("area", value)}
            />
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={resetFilters}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>

          {/* KPIs de cosecha */}
          <KpiGrid columns={4}>
            <MetricTile
              label="Ciclos analizados"
              value={formatInteger(payload.summary.cycleCount)}
              hint={`Hasta día ${payload.summary.maxDayOffset} relativo`}
            />
            <MetricTile
              label="Día pico (mediana)"
              value={payload.summary.peakDay !== null ? `Día ${payload.summary.peakDay}` : "—"}
              hint={
                payload.summary.peakMedianStems !== null
                  ? `${formatInteger(payload.summary.peakMedianStems)} tallos`
                  : "Sin datos"
              }
            />
            <MetricTile
              label="Tallos / ciclo (mediana)"
              value={
                payload.summary.medianTotalStemsPerCycle !== null
                  ? formatInteger(payload.summary.medianTotalStemsPerCycle)
                  : "—"
              }
              hint={
                payload.summary.meanTotalStemsPerCycle !== null
                  ? `Media: ${formatInteger(payload.summary.meanTotalStemsPerCycle)}`
                  : undefined
              }
            />
            <MetricTile
              label="Peso / tallo (mediana)"
              value={
                payload.summary.medianWeightPerStemG !== null
                  ? `${formatDecimal(payload.summary.medianWeightPerStemG)} g`
                  : "—"
              }
              hint={
                payload.summary.meanWeightPerStemG !== null
                  ? `Media: ${formatDecimal(payload.summary.meanWeightPerStemG)} g`
                  : undefined
              }
            />
          </KpiGrid>

          {/* KPIs del período vegetativo */}
          <KpiGrid columns={5}>
            <MetricTile
              label="Vegetativo (media)"
              value={payload.vegetative.mean !== null ? `${formatDecimal(payload.vegetative.mean)} d` : "—"}
              hint={`n=${payload.vegetative.cyclesConsidered} ciclos`}
            />
            <MetricTile
              label="Vegetativo (mediana)"
              value={
                payload.vegetative.median !== null
                  ? `${formatDecimal(payload.vegetative.median)} d`
                  : "—"
              }
            />
            <MetricTile
              label="Vegetativo (σ)"
              value={
                payload.vegetative.sampleSd !== null
                  ? `${formatDecimal(payload.vegetative.sampleSd)} d`
                  : "—"
              }
              hint="Desviación estándar muestral"
            />
            <MetricTile
              label="Vegetativo mín — máx"
              value={
                payload.vegetative.min !== null && payload.vegetative.max !== null
                  ? `${payload.vegetative.min} — ${payload.vegetative.max} d`
                  : "—"
              }
            />
            <MetricTile
              label="Vegetativo Q1 — Q3"
              value={
                payload.vegetative.p25 !== null && payload.vegetative.p75 !== null
                  ? `${formatDecimal(payload.vegetative.p25)} — ${formatDecimal(payload.vegetative.p75)} d`
                  : "—"
              }
              hint="Rango intercuartil"
            />
          </KpiGrid>
        </FilterPanel>
      </SectionPageShell>

      {error ? (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Error al cargar la curva agregada."}
          </CardContent>
        </Card>
      ) : null}

      {!hasData ? (
        <EmptyState label="Sin ciclos para los filtros actuales. Ajusta los filtros para incluir más ciclos en el análisis." />
      ) : (
        <>
          <ChartSection>
            <ChartSurface
              title="Curva agregada por día relativo"
              subtitle={
                isValidating
                  ? "Actualizando..."
                  : "Ponderado = sum/sum sobre todos los ciclos. En Peso/tallo, alterna Ponderado | Mediana."
              }
            >
              <AggregatedHarvestCurvePanel data={payload.points} />
            </ChartSurface>
          </ChartSection>

          <DetailSection>
            <Card>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">Detalle por ciclo</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatInteger(payload.cycles.length)} ciclos · Click en el ciclo para ver la
                    ficha del bloque
                  </p>
                </div>
                <CycleTable cycles={payload.cycles} onSelectCycle={setSelectedRow} />
              </CardContent>
            </Card>
          </DetailSection>
        </>
      )}

      <BlockProfileModal
        row={selectedRow}
        data={blockModal.blockData}
        loading={blockModal.blockLoading}
        error={blockModal.blockError}
        selectedCycleKey={blockModal.selectedCycleKey}
        bedData={blockModal.bedData}
        bedLoading={blockModal.bedLoading}
        bedError={blockModal.bedError}
        selectedValveCycleKey={blockModal.selectedValveCycleKey}
        valvesData={blockModal.valvesData}
        valvesLoading={blockModal.valvesLoading}
        valvesError={blockModal.valvesError}
        selectedValve={blockModal.selectedValve}
        valveData={blockModal.valveData}
        valveLoading={blockModal.valveLoading}
        valveError={blockModal.valveError}
        selectedCurveCycleKey={blockModal.selectedCurveCycleKey}
        curveData={blockModal.curveData}
        curveLoading={blockModal.curveLoading}
        curveError={blockModal.curveError}
        selectedMortalityCurve={blockModal.selectedMortalityCurve}
        mortalityCurveData={blockModal.mortalityCurveData}
        mortalityCurveLoading={blockModal.mortalityCurveLoading}
        mortalityCurveError={blockModal.mortalityCurveError}
        onOpenBeds={blockModal.openBeds}
        onCloseBeds={blockModal.closeBeds}
        onOpenValves={blockModal.openValves}
        onCloseValves={blockModal.closeValves}
        onOpenValve={blockModal.openValve}
        onOpenCurve={blockModal.openCurve}
        onCloseCurve={blockModal.closeCurve}
        onOpenCycleMortalityCurve={blockModal.openCycleMortalityCurve}
        onOpenValveMortalityCurve={blockModal.openValveMortalityCurve}
        onOpenBedMortalityCurve={blockModal.openBedMortalityCurve}
        onCloseMortalityCurve={blockModal.closeMortalityCurve}
        onClose={() => setSelectedRow(null)}
      />
    </div>
  );
}

function CycleTable({
  cycles,
  onSelectCycle,
}: {
  cycles: CurvaCosechaPayload["cycles"];
  onSelectCycle: (row: BlockModalRow) => void;
}) {
  const sorted = useMemo(
    () =>
      [...cycles].sort((a, b) => {
        // Por fecha de inicio cosecha descendente, luego por bloque
        if (a.harvestStartDate && b.harvestStartDate) {
          const cmp = b.harvestStartDate.localeCompare(a.harvestStartDate);
          if (cmp !== 0) return cmp;
        }
        return (a.block ?? "").localeCompare(b.block ?? "");
      }),
    [cycles],
  );

  function buildModalRow(cycle: CurvaCosechaPayload["cycles"][number]): BlockModalRow {
    return {
      block: cycle.block,
      cycleKey: cycle.cycleKey,
      area: cycle.area,
      variety: cycle.variety,
      spType: cycle.spType,
      spDate: cycle.spDate,
      harvestStartDate: cycle.harvestStartDate,
      harvestEndDate: cycle.harvestEndDate,
      totalStems: cycle.totalStems,
      primaryMetricLabel: "Vegetativo",
      primaryMetricText:
        cycle.vegetativeDays !== null ? `${cycle.vegetativeDays} días` : undefined,
    };
  }

  return (
    <ScrollFadeTable>
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left">Ciclo</th>
            <th className="px-3 py-2 text-left">Bloque</th>
            <th className="px-3 py-2 text-left">Área</th>
            <th className="px-3 py-2 text-left">Variedad</th>
            <th className="px-3 py-2 text-left">Tipo SP</th>
            <th className="px-3 py-2 text-left">SP</th>
            <th className="px-3 py-2 text-left">Inicio cosecha</th>
            <th className="px-3 py-2 text-left">Fin cosecha</th>
            <th className="px-3 py-2 text-right">Vegetativo</th>
            <th className="px-3 py-2 text-right">Días</th>
            <th className="px-3 py-2 text-right">Tallos</th>
            <th className="px-3 py-2 text-right">Kg</th>
            <th className="px-3 py-2 text-right">g/tallo</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((cycle) => (
            <tr key={cycle.cycleKey} className="border-b border-border/40 hover:bg-muted/40">
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onSelectCycle(buildModalRow(cycle))}
                  className="cursor-pointer font-mono text-xs text-primary underline-offset-2 hover:underline focus:outline-none focus:underline"
                  aria-label={`Abrir ficha del bloque ${cycle.block} con ciclo ${cycle.cycleKey}`}
                >
                  {cycle.cycleKey}
                </button>
              </td>
              <td className="px-3 py-2">{cycle.block || "—"}</td>
              <td className="px-3 py-2">{cycle.area || "—"}</td>
              <td className="px-3 py-2">{cycle.variety || "—"}</td>
              <td className="px-3 py-2">{cycle.spType || "—"}</td>
              <td className="px-3 py-2">{cycle.spDate ? formatDate(cycle.spDate) : "—"}</td>
              <td className="px-3 py-2">
                {cycle.harvestStartDate ? formatDate(cycle.harvestStartDate) : "—"}
              </td>
              <td className="px-3 py-2">
                {cycle.harvestEndDate ? formatDate(cycle.harvestEndDate) : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {cycle.vegetativeDays !== null ? `${cycle.vegetativeDays} d` : "—"}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatInteger(cycle.totalDays)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatInteger(cycle.totalStems)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatDecimal(cycle.totalGreenKg)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {cycle.weightPerStemG !== null ? formatDecimal(cycle.weightPerStemG) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollFadeTable>
  );
}
