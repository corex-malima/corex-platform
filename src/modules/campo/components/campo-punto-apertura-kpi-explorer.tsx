"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CircleAlert, LoaderCircle, RefreshCcw, TrendingUp } from "lucide-react";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LineChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import type {
  CampoPuntoAperturaGranularity,
  CampoPuntoAperturaAreaBreakdown,
  CampoPuntoAperturaKpiData,
  CampoPuntoAperturaKpiFilters,
  CampoPuntoAperturaNonConformityRecord,
} from "@/lib/campo-punto-apertura-kpi";
import { fetchJson } from "@/lib/fetch-json";
import {
  axisConfig,
  axisTickStyle,
  axisTickStyleCompact,
  gridConfig,
  tooltipCursorStyle,
} from "@/shared/charts/chart-axis-config";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState } from "@/shared/data-display/empty-state";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { DateField, MultiSelectField, SingleSelectField } from "@/shared/filters";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import {
  formatInteger,
  formatIsoWeekLabel,
  formatMonthNumeric,
  formatPercent,
} from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

const fetcher = (url: string) =>
  fetchJson<CampoPuntoAperturaKpiData>(url, "No se pudo cargar el KPI de punto de apertura.");

const GRANULARITY_OPTIONS: Array<{ value: CampoPuntoAperturaGranularity; label: string }> = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];
type CampoPuntoAperturaView = "distribution" | "homogeneity";

function buildQueryString(filters: CampoPuntoAperturaKpiFilters) {
  const params = new URLSearchParams();
  params.set("granularity", filters.granularity);
  params.set("isoWeek", filters.isoWeek);
  params.set("area", filters.area);
  params.set("spType", filters.spType);
  params.set("variety", filters.variety);
  params.set("month", filters.month);
  params.set("year", filters.year);
  params.set("date", filters.date);
  params.set("dominantClass", filters.dominantClass);
  params.set("bloque", filters.bloque);
  return params.toString();
}

function granularityLabel(value: CampoPuntoAperturaGranularity) {
  return GRANULARITY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function formatPct(value: number | null) {
  if (value === null) return "â€”";
  return formatPercent(value, {
    input: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function periodLabel(value: string, granularity: CampoPuntoAperturaGranularity) {
  if (granularity === "month") {
    const [year, month] = value.split("-");
    if (!year || !month) return value;
    return `${formatMonthNumeric(String(Number(month)))} ${year}`;
  }
  if (granularity === "week") {
    return formatIsoWeekLabel(value);
  }
  return value;
}

function statusAccent(value: number | null, goal: number | null) {
  if (value === null || goal === null) return "default" as const;
  if (value >= goal) return "success" as const;
  if (value >= goal - 5) return "warning" as const;
  return "danger" as const;
}

function pctWidth(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function distributionColor(index: number) {
  return [
    "var(--color-chart-info-bold)",
    "var(--color-chart-success-bold)",
    "var(--color-chart-warning)",
    "var(--color-chart-danger)",
    "var(--color-chart-info-muted)",
  ][index] ?? "var(--color-chart-info-bold)";
}

function normalizeTargetCategoryLabel(value: string | null) {
  const raw = (value ?? "").trim().toLowerCase().replace(/\s+/g, "");
  if (!raw) return "Sin categoría objetivo";
  if (raw === "boton") return "Botón";
  if (raw === "1a3") return "1 a 3";
  if (raw === "4a9") return "4 a 9";
  if (raw === "10a20") return "10 a 20";
  if (raw === "másde20" || raw === "masde20" || raw === "20+") return "Más de 20";
  return value ?? "Sin categoría objetivo";
}

function NonConformityDetailsList({
  details,
}: {
  details: CampoPuntoAperturaNonConformityRecord[];
}) {
  if (details.length === 0) return null;

  return (
    <div className="mt-3 rounded-[18px] border border-border/70 bg-card/75 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Fechas no conformes</p>
        <Badge variant="danger">{formatInteger(details.length)} día(s)</Badge>
      </div>
      <div className="space-y-2">
        {details.map((detail) => (
          <div
            key={detail.key}
            className="rounded-[16px] border border-danger/20 bg-danger/5 px-3 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{detail.fecha}</p>
                <p className="text-xs text-muted-foreground">
                  {formatInteger(detail.totalStems)} tallos evaluados
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>4 a 9: {formatPct(detail.pctCuatroNueve)}</span>
                <span>10 a 20: {formatPct(detail.pctDiezVeinte)}</span>
                <span>Más de 20: {formatPct(detail.pctMasVeinte)}</span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.triggeredRules.map((rule) => (
                <Badge key={`${detail.key}-${rule.key}`} variant="danger">
                  {rule.label} ({formatPct(rule.measuredPct)})
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AreaBreakdownCard({ row }: { row: CampoPuntoAperturaAreaBreakdown }) {
  const [expandedNonConformityKey, setExpandedNonConformityKey] = useState<string | null>(null);

  function toggleBlockNonConformity(blockKey: string, canOpen: boolean) {
    if (!canOpen) return;
    setExpandedNonConformityKey((current) => (current === blockKey ? null : blockKey));
  }

  return (
    <details className="group rounded-[24px] border border-border/70 bg-card/88">
      <summary className="list-none cursor-pointer p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{row.area}</span>
              <Badge variant="outline">{formatInteger(row.totalRecords)} registros</Badge>
              <Badge variant={row.unofficialRecords > 0 ? "warning" : "secondary"}>
                Sin meta: {formatInteger(row.unofficialRecords)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Tallo muestreado: {formatInteger(row.totalStems)} | Dominante general: {row.dominantCategoryName ?? "Sin lectura"}
            </p>
          </div>
          <div className="grid min-w-[180px] gap-3 sm:grid-cols-1">
            <MetricTile
              label="Cumplimiento KPI"
              value={formatPct(row.goalAttainmentPct)}
              accent={statusAccent(row.weightedCompliancePct, row.goalPct)}
            />
            <MetricTile
              label="No conformidades"
              value={formatInteger(row.nonConformingBlockDays)}
              hint={`${formatInteger(row.totalBlockDays)} bloques-día`}
              accent={row.nonConformingBlockDays > 0 ? "danger" : "default"}
            />
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: pctWidth(row.goalAttainmentPct ?? 0) }}
          />
        </div>
      </summary>
      <div className="border-t border-border/70 px-4 py-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Desagregación por bloque</p>
          {row.blocks.length === 0 ? (
            <EmptyState label="No hay bloques visibles para esta área." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {row.blocks.map((block) => (
                <div key={`${row.area}-${block.block}`} className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{block.block}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatInteger(block.totalRecords)} registros | {formatInteger(block.totalStems)} tallos | {block.dominantCategoryName ?? "Sin dominante"}
                      </p>
                    </div>
                    <Badge variant={block.unofficialRecords > 0 ? "warning" : "secondary"}>
                      Sin meta: {formatInteger(block.unofficialRecords)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <MetricTile
                      label="Cumplimiento KPI"
                      value={formatPct(block.goalAttainmentPct)}
                      accent={statusAccent(block.weightedCompliancePct, block.goalPct)}
                    />
                    <button
                      type="button"
                      onClick={() => toggleBlockNonConformity(`${row.area}-${block.block}`, block.hasNonConformity)}
                      className={[
                        "rounded-[20px] border px-4 py-4 text-left transition-colors",
                        block.hasNonConformity
                          ? "border-danger/30 bg-danger/5 hover:bg-danger/10"
                          : "border-border/70 bg-card/80",
                      ].join(" ")}
                      aria-expanded={expandedNonConformityKey === `${row.area}-${block.block}`}
                      disabled={!block.hasNonConformity}
                    >
                      <p className="text-xs font-medium text-muted-foreground">No conformidad</p>
                      <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                        {formatInteger(block.nonConformingBlockDays)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatInteger(block.totalBlockDays)} día(s) analizados
                      </p>
                      {block.hasNonConformity ? (
                        <p className="mt-2 text-xs font-medium text-danger">
                          Ver fechas y reglas incumplidas
                        </p>
                      ) : null}
                    </button>
                  </div>
                  {block.triggeredRuleLabels.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {block.triggeredRuleLabels.map((ruleLabel) => (
                        <Badge key={`${row.area}-${block.block}-${ruleLabel}`} variant="danger">
                          {ruleLabel}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {expandedNonConformityKey === `${row.area}-${block.block}` ? (
                    <NonConformityDetailsList details={block.nonConformityDetails} />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function HomogeneityAreaBreakdownCard({
  row,
}: {
  row: CampoPuntoAperturaKpiData["homogeneity"]["areas"][number];
}) {
  const [expandedBlockKey, setExpandedBlockKey] = useState<string | null>(null);

  return (
    <details className="group rounded-[24px] border border-border/70 bg-card/88">
      <summary className="list-none cursor-pointer p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">{row.area}</span>
              <Badge variant="outline">{formatInteger(row.totalRecords)} registros</Badge>
              <Badge variant={row.unofficialRecords > 0 ? "warning" : "secondary"}>
                Sin meta: {formatInteger(row.unofficialRecords)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Homogéneos: {formatInteger(row.homogeneousRecords)} | No homogéneos: {formatInteger(row.nonHomogeneousRecords)}
            </p>
          </div>
          <div className="grid min-w-[180px] gap-3 sm:grid-cols-1">
            <MetricTile
              label="Cumplimiento KPI"
              value={formatPct(row.goalAttainmentPct)}
              accent={statusAccent(row.homogeneousPct, row.goalPct)}
            />
            <MetricTile
              label="No conformidades"
              value={formatInteger(row.nonConformingBlockDays)}
              hint={`${formatInteger(row.totalBlockDays)} bloques-día`}
              accent={row.nonConformingBlockDays > 0 ? "danger" : "default"}
            />
          </div>
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-slate-900 transition-all"
            style={{ width: pctWidth(row.goalAttainmentPct ?? 0) }}
          />
        </div>
      </summary>
      <div className="border-t border-border/70 px-4 py-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Desagregación por bloque</p>
          {row.blocks.length === 0 ? (
            <EmptyState label="No hay bloques visibles para esta área." />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {row.blocks.map((block) => {
                const blockKey = `${row.area}-${block.block}`;
                return (
                  <div key={blockKey} className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">{block.block}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatInteger(block.totalRecords)} registros | Homogéneos: {formatInteger(block.homogeneousRecords)} | No homogéneos: {formatInteger(block.nonHomogeneousRecords)}
                        </p>
                      </div>
                      <Badge variant={block.unofficialRecords > 0 ? "warning" : "secondary"}>
                        Sin meta: {formatInteger(block.unofficialRecords)}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <MetricTile
                        label="Cumplimiento KPI"
                        value={formatPct(block.goalAttainmentPct)}
                        accent={statusAccent(block.homogeneousPct, block.goalPct)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          block.nonConformingBlockDays > 0
                            ? setExpandedBlockKey((current) => (current === blockKey ? null : blockKey))
                            : null
                        }
                        className={[
                          "rounded-[20px] border px-4 py-4 text-left transition-colors",
                          block.nonConformingBlockDays > 0
                            ? "border-danger/30 bg-danger/5 hover:bg-danger/10"
                            : "border-border/70 bg-card/80",
                        ].join(" ")}
                        aria-expanded={expandedBlockKey === blockKey}
                        disabled={block.nonConformingBlockDays === 0}
                      >
                        <p className="text-xs font-medium text-muted-foreground">No conformidad</p>
                        <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                          {formatInteger(block.nonConformingBlockDays)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatInteger(block.totalBlockDays)} día(s) analizados
                        </p>
                        {block.nonConformingBlockDays > 0 ? (
                          <p className="mt-2 text-xs font-medium text-danger">
                            Ver fechas que incumplieron
                          </p>
                        ) : null}
                      </button>
                    </div>
                    {expandedBlockKey === blockKey ? (
                      <div className="mt-3 rounded-[18px] border border-border/70 bg-card/75 p-3">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">Fechas no conformes</p>
                          <Badge variant="danger">{formatInteger(block.nonConformingBlockDays)} día(s)</Badge>
                        </div>
                        <div className="space-y-2">
                          {block.nonConformityDetails.map((detail) => (
                            <div
                              key={`${blockKey}-${detail.key}`}
                              className="rounded-[16px] border border-danger/20 bg-danger/5 px-3 py-3"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold">{detail.fecha}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatInteger(detail.homogeneousRecords)} homogéneos de {formatInteger(detail.totalRecords)} registros
                                  </p>
                                </div>
                                <Badge variant="danger">
                                  {formatPct(detail.homogeneousPct)} / {formatPct(block.goalPct)}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

export function CampoPuntoAperturaKpiExplorer({ initialData }: { initialData: CampoPuntoAperturaKpiData }) {
  const [filters, setFilters] = useState<CampoPuntoAperturaKpiFilters>(initialData.filters);
  const [view, setView] = useState<CampoPuntoAperturaView>("distribution");
  const deferredFilters = useDeferredValue(filters);

  const initialKey = useMemo(() => buildQueryString(initialData.filters), [initialData.filters]);
  const currentKey = useMemo(() => buildQueryString(deferredFilters), [deferredFilters]);

  const { data: dashboardData, error, isValidating, mutate } = useSWR(
    `/api/campo/punto-apertura?${currentKey}`,
    fetcher,
    {
      fallbackData: currentKey === initialKey ? initialData : undefined,
      keepPreviousData: true,
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      onError: (err) => toast.error(err?.message || "Error al cargar el KPI de punto de apertura"),
    },
  );

  const data = dashboardData ?? initialData;

  function updateFilter<K extends keyof CampoPuntoAperturaKpiFilters>(key: K, value: CampoPuntoAperturaKpiFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(initialData.filters);
  }

  const trendRows = data.timeSeries.map((row) => ({
    ...row,
    chartLabel: periodLabel(row.periodLabel, data.filters.granularity),
  }));
  const officialTrendRows = trendRows.filter((row) => row.goalPct !== null);

  const distributionRows = data.distribution.map((row, index) => ({
    ...row,
    fill: distributionColor(index),
  }));
  const targetCategoryLabel = normalizeTargetCategoryLabel(data.summary.targetCategoryLabel);
  const exactParticipationLegendLabel = data.summary.targetCategoryLabel
    ? `Participación exacta (${targetCategoryLabel})`
    : "Participación exacta";

  const homogeneityDistributionRows = data.homogeneity.distribution.map((row, index) => ({
    ...row,
    fill: index === 0 ? "var(--color-chart-success-bold)" : "var(--color-chart-danger)",
  }));
  const homogeneityTrendRows = data.homogeneity.timeSeries.map((row) => ({
    ...row,
    chartLabel: periodLabel(row.periodLabel, data.filters.granularity),
  }));
  const officialHomogeneityTrendRows = homogeneityTrendRows.filter((row) => row.goalPct !== null);
  const homogeneityNonConformingBlockDays = data.homogeneity.areas.reduce(
    (acc, area) => acc + area.nonConformingBlockDays,
    0,
  );
  const homogeneityTotalBlockDays = data.homogeneity.areas.reduce((acc, area) => acc + area.totalBlockDays, 0);
  const isDistributionView = view === "distribution";
  const isHomogeneityView = view === "homogeneity";

  const hasData = data.summary.totalRecords > 0;

  return (
    <div className="min-w-0 space-y-4">
      <SectionPageShell
        eyebrow="Analítica / Campo / Indicadores & KPI"
        title="Punto de apertura"
        subtitle="Indicador gerencial construido sobre la medición histórica de Calidad, con lectura móvil por día, semana o mes y drilldown hasta bloque."
        icon={<TrendingUp className="size-6" aria-hidden="true" />}
      >
        <FilterPanel>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SingleSelectField
              id="campo-pa-granularity"
              label="Granularidad"
              value={filters.granularity}
              options={GRANULARITY_OPTIONS.map((option) => option.value)}
              onChange={(value) => updateFilter("granularity", value as CampoPuntoAperturaGranularity)}
              emptyLabel="Semana"
              emptyValue="week"
              displayValue={(value) => granularityLabel(value as CampoPuntoAperturaGranularity)}
              omitEmpty
            />
            <MultiSelectField
              id="campo-pa-week"
              label="Semana"
              value={filters.isoWeek}
              options={data.options.isoWeeks}
              onChange={(value) => updateFilter("isoWeek", value)}
              displayValue={formatIsoWeekLabel}
            />
            <MultiSelectField
              id="campo-pa-year"
              label="Año"
              value={filters.year}
              options={data.options.years}
              onChange={(value) => updateFilter("year", value)}
            />
            <MultiSelectField
              id="campo-pa-month"
              label="Mes"
              value={filters.month}
              options={data.options.months}
              onChange={(value) => updateFilter("month", value)}
              displayValue={formatMonthNumeric}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <DateField
              id="campo-pa-date"
              label="Día"
              value={filters.date}
              onChange={(value) => updateFilter("date", value)}
            />
            <MultiSelectField
              id="campo-pa-area"
              label="Área"
              value={filters.area}
              options={data.options.areas}
              onChange={(value) => updateFilter("area", value)}
            />
            <MultiSelectField
              id="campo-pa-sp-type"
              label="Tipo SP"
              value={filters.spType}
              options={data.options.spTypes}
              onChange={(value) => updateFilter("spType", value)}
            />
            <MultiSelectField
              id="campo-pa-variety"
              label="Variedad"
              value={filters.variety}
              options={data.options.varieties}
              onChange={(value) => updateFilter("variety", value)}
            />
            <div className="flex items-end">
              <Button variant="outline" className="w-full" onClick={resetFilters}>
                <RefreshCcw className="size-4" aria-hidden="true" />
                Restablecer
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isDistributionView ? "default" : "outline"}
              onClick={() => setView("distribution")}
            >
              Distribución
            </Button>
            <Button
              type="button"
              variant={isHomogeneityView ? "default" : "outline"}
              onClick={() => setView("homogeneity")}
            >
              Homogeneidad
            </Button>
          </div>

          {isDistributionView ? (
          <KpiGrid columns={4}>
            <MetricTile
              label="Resultado ponderado"
              value={formatPct(data.summary.weightedCompliancePct)}
              hint={data.summary.goalPct === null ? "Sin meta activa" : `Meta ${formatPct(data.summary.goalPct)}`}
              accent={statusAccent(data.summary.weightedCompliancePct, data.summary.goalPct)}
            />
            <MetricTile
              label="Resultado esperado"
              value={formatPct(data.summary.goalPct)}
              hint={data.goal.directGoalPct === null ? "Sin meta exacta" : `Participación exacta esperada ${formatPct(data.goal.directGoalPct)}`}
            />
            <MetricTile
              label="Cumplimiento KPI"
              value={formatPct(data.summary.goalAttainmentPct)}
              hint={
                data.summary.goalPct === null || data.summary.weightedCompliancePct === null
                  ? "Sin meta activa"
                  : `${formatPct(data.summary.weightedCompliancePct)} / ${formatPct(data.summary.goalPct)}`
              }
              accent={statusAccent(data.summary.weightedCompliancePct, data.summary.goalPct)}
            />
            <Card className="min-w-0 border-border/70 bg-card/90">
              <CardContent className="min-w-0 px-4 py-4">
                <p className="break-words text-xs font-medium text-muted-foreground">Participación exacta en objetivo</p>
                <p className="mt-2 break-words text-xl font-semibold tracking-tight tabular-nums sm:text-2xl">
                  {formatPct(data.summary.directCompliancePct)}
                </p>
                <div className="mt-1 flex items-end justify-between gap-3 text-xs text-muted-foreground">
                  <span className="break-words">
                    {data.summary.targetCategoryLabel ? `Objetivo ${data.summary.targetCategoryLabel}` : "Sin regla operativa"}
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    {formatInteger(data.summary.officialStems)} tallos
                  </span>
                </div>
              </CardContent>
            </Card>
          </KpiGrid>
          ) : (
            <KpiGrid columns={4}>
              <MetricTile
                label="Resultado homogéneo"
                value={formatPct(data.homogeneity.summary.homogeneousPct)}
                hint={
                  data.homogeneity.summary.goalPct === null
                    ? "Sin meta activa"
                    : `Meta ${formatPct(data.homogeneity.summary.goalPct)}`
                }
                accent={statusAccent(data.homogeneity.summary.homogeneousPct, data.homogeneity.summary.goalPct)}
              />
              <MetricTile
                label="Resultado esperado"
                value={formatPct(data.homogeneity.summary.goalPct)}
                hint="Meta global para todas las variedades"
              />
              <MetricTile
                label="Cumplimiento KPI"
                value={formatPct(data.homogeneity.summary.goalAttainmentPct)}
                hint={
                  data.homogeneity.summary.goalPct === null || data.homogeneity.summary.homogeneousPct === null
                    ? "Sin meta activa"
                    : `${formatPct(data.homogeneity.summary.homogeneousPct)} / ${formatPct(data.homogeneity.summary.goalPct)}`
                }
                accent={statusAccent(data.homogeneity.summary.homogeneousPct, data.homogeneity.summary.goalPct)}
              />
              <MetricTile
                label="No conformidades"
                value={formatInteger(homogeneityNonConformingBlockDays)}
                hint={`${formatInteger(homogeneityTotalBlockDays)} bloques-día`}
                accent={homogeneityNonConformingBlockDays > 0 ? "danger" : "default"}
              />
            </KpiGrid>
          )}

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary" className="rounded-full px-3 py-1">
              Registros visibles: {formatInteger(isDistributionView ? data.summary.totalRecords : data.homogeneity.summary.totalRecords)}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {isDistributionView
                ? `Tallo muestreado: ${formatInteger(data.summary.totalStems)}`
                : `Homogéneos: ${formatInteger(data.homogeneity.summary.homogeneousRecords)} / ${formatInteger(data.homogeneity.summary.totalRecords)}`}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Meta fuente: {isDistributionView ? data.goal.targetCode ?? "Sin meta" : data.homogeneity.goal.targetCode ?? "Sin meta"}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              Vigencia meta: {isDistributionView ? data.goal.validFrom ?? "No definida" : data.homogeneity.goal.validFrom ?? "No definida"}
            </Badge>
            {isValidating ? (
              <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                Actualizando.
              </span>
            ) : null}
          </div>

          {error ? (
            <div className="flex items-center gap-3 text-sm text-destructive">
              {error.message}
              <button type="button" className="underline underline-offset-2" onClick={() => mutate()}>
                Reintentar
              </button>
            </div>
          ) : null}
        </FilterPanel>
      </SectionPageShell>

      {!hasData ? (
        <EmptyState label="No hay registros de punto de apertura para los filtros seleccionados." />
      ) : (
        <>
          {isDistributionView ? (
          <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
            <ChartSurface
              title="Banda histórica de cumplimiento"
              subtitle={`Serie ${granularityLabel(data.filters.granularity).toLowerCase()} del cumplimiento ponderado frente a la meta KPI.`}
            >
              <div className="mb-4 flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  Cumplimiento KPI: {formatPct(data.summary.goalAttainmentPct)} de {formatPct(data.summary.goalPct)}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Resultado ponderado: {formatPct(data.summary.weightedCompliancePct)}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1">
                  Categoría objetivo: {targetCategoryLabel}
                </Badge>
              </div>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={officialTrendRows} margin={{ top: 10, right: 16, left: 0, bottom: 12 }}>
                    <CartesianGrid {...gridConfig} />
                    <XAxis dataKey="chartLabel" {...axisConfig} tick={axisTickStyleCompact} minTickGap={24} />
                    <YAxis {...axisConfig} tick={axisTickStyle} domain={[0, 100]} />
                    <Tooltip
                      cursor={tooltipCursorStyle}
                      content={(
                        <RechartsTooltipAdapter
                          title={(label) => String(label)}
                          mapPayload={(payload) => {
                            const chartRow = payload[0]?.payload as {
                              goalAttainmentPct?: number | null;
                              weightedCompliancePct?: number | null;
                              directCompliancePct?: number | null;
                              goalPct?: number | null;
                            } | undefined;
                            return [
                              {
                                label: "Cumplimiento KPI",
                                value:
                                  typeof chartRow?.goalAttainmentPct === "number"
                                    ? formatPct(chartRow.goalAttainmentPct)
                                    : "â€”",
                              },
                              {
                                label: "Resultado ponderado / Meta KPI",
                                value:
                                  typeof chartRow?.weightedCompliancePct === "number" && typeof chartRow?.goalPct === "number"
                                    ? `${formatPct(chartRow.weightedCompliancePct)} / ${formatPct(chartRow.goalPct)}`
                                    : "â€”",
                              },
                              {
                                label: exactParticipationLegendLabel,
                                value:
                                  typeof chartRow?.directCompliancePct === "number"
                                    ? formatPct(chartRow.directCompliancePct)
                                    : "â€”",
                              },
                            ];
                          }}
                        />
                      )}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="goalPct" name="Meta KPI" stroke="var(--color-chart-danger)" strokeWidth={2} dot={false} connectNulls />
                    <Line type="monotone" dataKey="directCompliancePct" name={exactParticipationLegendLabel} stroke="var(--color-chart-info-bold)" strokeWidth={2} dot={{ r: 2 }} connectNulls />
                    <Line type="monotone" dataKey="weightedCompliancePct" name="Cumplimiento ponderado" stroke="var(--color-chart-success-bold)" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartSurface>

            <ChartSurface
              title="Distribución del período visible"
              subtitle="Composición del muestreo por categoría de apertura sobre todos los registros filtrados."
            >
              <div className="mb-4 flex flex-wrap gap-2">
                {distributionRows.map((row) => (
                  <Badge key={row.categoryCode} variant="outline" className="rounded-full px-3 py-1">
                    {row.categoryName}: {formatPct(row.pct)}
                  </Badge>
                ))}
              </div>
              <div className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionRows} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                    <CartesianGrid {...gridConfig} horizontal={false} vertical />
                    <XAxis type="number" {...axisConfig} tick={axisTickStyle} domain={[0, 100]} />
                    <YAxis dataKey="categoryName" type="category" width={90} {...axisConfig} tick={axisTickStyle} />
                    <Tooltip
                      cursor={tooltipCursorStyle}
                      content={(
                        <RechartsTooltipAdapter
                          title={(label) => String(label)}
                          mapPayload={(_, label) => {
                            const row = distributionRows.find((item) => item.categoryName === label);
                            if (!row) return [];
                            return [
                              { label: "Participación", value: formatPct(row.pct) },
                              { label: "Tallos", value: formatInteger(row.count) },
                            ];
                          }}
                        />
                      )}
                    />
                    <Bar dataKey="pct" name="Participación" radius={[0, 12, 12, 0]}>
                      {distributionRows.map((row) => (
                        <Cell key={row.categoryCode} fill={row.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartSurface>
          </div>
          ) : null}

          {isHomogeneityView ? (
          <Card className="rounded-[24px] border border-border/70 bg-card/92">
            <CardContent className="space-y-5 pt-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">Vista de homogeneidad</h2>
                <p className="text-sm text-muted-foreground">
                  KPI de homogeneidad con meta global del 90%. Si el bloque-día cae por debajo de la meta, se marca como no conformidad.
                </p>
              </div>


              <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
                <ChartSurface
                  title="Banda histórica de homogeneidad"
                  subtitle={`Serie ${granularityLabel(data.filters.granularity).toLowerCase()} de homogeneidad frente a la meta KPI.`}
                >
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={officialHomogeneityTrendRows} margin={{ top: 10, right: 16, left: 0, bottom: 12 }}>
                        <CartesianGrid {...gridConfig} />
                        <XAxis dataKey="chartLabel" {...axisConfig} tick={axisTickStyleCompact} minTickGap={24} />
                        <YAxis {...axisConfig} tick={axisTickStyle} domain={[0, 100]} />
                        <Tooltip
                          cursor={tooltipCursorStyle}
                          content={(
                            <RechartsTooltipAdapter
                              title={(label) => String(label)}
                              mapPayload={(payload) => {
                                const chartRow = payload[0]?.payload as {
                                  homogeneousPct?: number | null;
                                  goalPct?: number | null;
                                  goalAttainmentPct?: number | null;
                                } | undefined;
                                return [
                                  {
                                    label: "Cumplimiento KPI",
                                    value:
                                      typeof chartRow?.goalAttainmentPct === "number"
                                        ? formatPct(chartRow.goalAttainmentPct)
                                        : "â€”",
                                  },
                                  {
                                    label: "Homogeneidad / Meta KPI",
                                    value:
                                      typeof chartRow?.homogeneousPct === "number" && typeof chartRow?.goalPct === "number"
                                        ? `${formatPct(chartRow.homogeneousPct)} / ${formatPct(chartRow.goalPct)}`
                                        : "â€”",
                                  },
                                ];
                              }}
                            />
                          )}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="goalPct" name="Meta KPI" stroke="var(--color-chart-danger)" strokeWidth={2} dot={false} connectNulls />
                        <Line type="monotone" dataKey="homogeneousPct" name="Homogeneidad" stroke="var(--color-chart-success-bold)" strokeWidth={3} dot={{ r: 3 }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartSurface>

                <ChartSurface
                  title="Distribución del período visible"
                  subtitle="Participación de registros homogéneos frente a no homogéneos."
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    {homogeneityDistributionRows.map((row) => (
                      <Badge key={row.status} variant={row.status === "Homogeneo" ? "success" : "danger"} className="rounded-full px-3 py-1">
                        {row.status}: {formatPct(row.pct)}
                      </Badge>
                    ))}
                  </div>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={homogeneityDistributionRows} layout="vertical" margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
                        <CartesianGrid {...gridConfig} horizontal={false} vertical />
                        <XAxis type="number" {...axisConfig} tick={axisTickStyle} domain={[0, 100]} />
                        <YAxis dataKey="status" type="category" width={110} {...axisConfig} tick={axisTickStyle} />
                        <Tooltip
                          cursor={tooltipCursorStyle}
                          content={(
                            <RechartsTooltipAdapter
                              title={(label) => String(label)}
                              mapPayload={(_, label) => {
                                const row = homogeneityDistributionRows.find((item) => item.status === label);
                                if (!row) return [];
                                return [
                                  { label: "Participación", value: formatPct(row.pct) },
                                  { label: "Registros", value: formatInteger(row.count) },
                                ];
                              }}
                            />
                          )}
                        />
                        <Bar dataKey="pct" radius={[0, 12, 12, 0]}>
                          {homogeneityDistributionRows.map((row) => (
                            <Cell key={row.status} fill={row.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartSurface>
              </div>

              <Card className="rounded-[20px] border border-border/70 bg-background/70">
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight">Homogeneidad por área y bloque</h3>
                    <p className="text-sm text-muted-foreground">
                      La no conformidad se activa cuando la homogeneidad del bloque-día baja del 90%.
                    </p>
                  </div>
                  {data.homogeneity.areas.length === 0 ? (
                    <EmptyState label="No hay datos suficientes para construir el breakdown de homogeneidad." />
                  ) : (
                    <div className="space-y-3">
                      {data.homogeneity.areas.map((areaRow) => (
                        <HomogeneityAreaBreakdownCard key={areaRow.area} row={areaRow} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
          ) : null}

          {isDistributionView ? (
          <Card className="rounded-[24px] border border-border/70 bg-card/92">
            <CardContent className="space-y-4 pt-6">
              <div>
                  <h2 className="text-lg font-semibold tracking-tight">Cumplimiento por área y bloque</h2>
                  <p className="text-sm text-muted-foreground">
                    Desagregación operativa para identificar qué áreas y bloques sostienen o deterioran el punto de apertura.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="outline">Más de 20 &gt; 2%</Badge>
                    <Badge variant="outline">10 a 20 + Más de 20 &gt;= 25%</Badge>
                    <Badge variant="outline">4 a 9 &gt;= 50%</Badge>
                    <Badge variant="secondary">Pendiente de parametrizar en catálogo</Badge>
                  </div>
              </div>
              {data.areas.length === 0 ? (
                <EmptyState label="No hay áreas visibles para los filtros aplicados." />
              ) : (
                <div className="space-y-3">
                  {data.areas.map((areaRow) => (
                    <AreaBreakdownCard key={areaRow.area} row={areaRow} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          ) : null}

          <Card className="rounded-[24px] border border-border/70 bg-card/92">
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 size-5 text-muted-foreground" aria-hidden="true" />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight">Notas metodológicas</h2>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {data.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
