"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, RefreshCcw } from "lucide-react";
import useSWR from "swr";

import type {
  DrenchWeekCalendarFilters,
  DrenchWeekCalendarOptions,
  DrenchWeekCalendarRow,
} from "@/lib/drench-week-calendar";
import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/data-display/empty-state";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { SingleSelectField } from "@/shared/filters/single-select-field";
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import { formatCount, formatDate, formatInteger, formatIsoWeekLabel } from "@/shared/lib/format";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

type ExplorerResponse = {
  rows: DrenchWeekCalendarRow[];
  options: DrenchWeekCalendarOptions;
  appliedFilters: DrenchWeekCalendarFilters;
};

type GroupSummary = {
  label: string;
  cycleCount: number;
  blockCount: number;
  minWeek: number;
  maxWeek: number;
};

type ExplorerProps = {
  initialRows: DrenchWeekCalendarRow[];
  initialOptions: DrenchWeekCalendarOptions;
  initialFilters: DrenchWeekCalendarFilters;
  icon?: LucideIcon;
};

const EMPTY_ROWS: DrenchWeekCalendarRow[] = [];

const weekLabel = (option: DrenchWeekCalendarOptions["isoWeeks"][number]) =>
  `${formatIsoWeekLabel(option.isoWeekId)} · ${formatDate(option.weekStartDate)} - ${formatDate(option.weekEndDate)}`;

const fetcher = (url: string) =>
  fetchJson<ExplorerResponse>(url, "No se pudo cargar la calendarizacion semanal de drench.");

function buildQueryString(filters: DrenchWeekCalendarFilters) {
  const search = new URLSearchParams();
  if (filters.isoWeekId) search.set("isoWeekId", filters.isoWeekId);
  if (filters.cycleType) search.set("cycleType", filters.cycleType);
  if (filters.variety) search.set("variety", filters.variety);
  if (filters.areaId) search.set("areaId", filters.areaId);
  return search.toString();
}

function getCycleTypeLabel(value: string) {
  return value === "P" ? "Poda" : value === "S" ? "Siembra" : value;
}

export function BodegaProgramacionesExplorer({
  initialRows = EMPTY_ROWS,
  initialOptions,
  initialFilters,
  icon: Icon = CalendarClock,
}: ExplorerProps) {
  const [filters, setFilters] = useState<DrenchWeekCalendarFilters>(initialFilters);
  const queryString = useMemo(() => buildQueryString(filters), [filters]);

  const { data, isLoading } = useSWR<ExplorerResponse>(
    `/api/bodega/planificacion/programaciones?${queryString}`,
    fetcher,
    {
      fallbackData: {
        rows: initialRows,
        options: initialOptions,
        appliedFilters: initialFilters,
      },
      keepPreviousData: true,
      dedupingInterval: 60_000,
    },
  );

  const rows = data?.rows ?? initialRows;
  const options = data?.options ?? initialOptions;

  const selectedWeek = useMemo(
    () => options.isoWeeks.find((option) => option.isoWeekId === filters.isoWeekId) ?? null,
    [options.isoWeeks, filters.isoWeekId],
  );

  const kpis = useMemo(() => {
    const cycleCount = new Set(rows.map((row) => row.cycleKey)).size;
    const blockCount = new Set(rows.map((row) => row.blockId)).size;
    const groupCount = new Set(rows.map((row) => row.drenchGroupKey)).size;
    const phenologicalWeeks = rows.map((row) => row.phenologicalWeek);
    const minWeek = phenologicalWeeks.length ? Math.min(...phenologicalWeeks) : 0;
    const maxWeek = phenologicalWeeks.length ? Math.max(...phenologicalWeeks) : 0;

    return {
      cycleCount,
      blockCount,
      groupCount,
      minWeek,
      maxWeek,
    };
  }, [rows]);

  const groupedSummaries = useMemo<GroupSummary[]>(() => {
    const groups = new Map<string, GroupSummary & { cycleKeys: Set<string>; blockIds: Set<string> }>();

    for (const row of rows) {
      const existing = groups.get(row.drenchGroupKey) ?? {
        label: row.drenchGroupLabel,
        cycleCount: 0,
        blockCount: 0,
        minWeek: row.phenologicalWeek,
        maxWeek: row.phenologicalWeek,
        cycleKeys: new Set<string>(),
        blockIds: new Set<string>(),
      };

      existing.cycleKeys.add(row.cycleKey);
      existing.blockIds.add(row.blockId);
      existing.minWeek = Math.min(existing.minWeek, row.phenologicalWeek);
      existing.maxWeek = Math.max(existing.maxWeek, row.phenologicalWeek);
      groups.set(row.drenchGroupKey, existing);
    }

    return Array.from(groups.values())
      .map((group) => ({
        label: group.label,
        cycleCount: group.cycleKeys.size,
        blockCount: group.blockIds.size,
        minWeek: group.minWeek,
        maxWeek: group.maxWeek,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "es"));
  }, [rows]);

  const defaultIsoWeekId = options.defaultIsoWeekId || options.isoWeeks[0]?.isoWeekId || "";

  function resetFilters() {
    setFilters({
      isoWeekId: defaultIsoWeekId,
      cycleType: "",
      variety: "",
      areaId: "",
    });
  }

  return (
    <SectionPageShell
      eyebrow="Gestion / Bodega / Planificacion"
      title="Programaciones"
      subtitle="Calendarizacion semanal de drench por semana ISO. Esta vista resuelve la semana fenologica por bloque usando el jueves de la semana objetivo como fecha ancla."
      icon={<Icon className="size-6" aria-hidden="true" />}
    >
      <FilterPanel>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1.7fr_1fr_1fr_1fr_auto]">
          <SingleSelectField
            id="drench-calendar-iso-week"
            label="Semana ISO objetivo"
            value={filters.isoWeekId}
            options={options.isoWeeks.map((option) => option.isoWeekId)}
            onChange={(value) => setFilters((current) => ({ ...current, isoWeekId: value }))}
            omitEmpty
            displayValue={(value) => {
              const option = options.isoWeeks.find((item) => item.isoWeekId === value);
              return option ? weekLabel(option) : value;
            }}
          />
          <SingleSelectField
            id="drench-calendar-cycle-type"
            label="Tipo SP"
            value={filters.cycleType}
            options={options.cycleTypes}
            onChange={(value) => setFilters((current) => ({ ...current, cycleType: value }))}
            emptyLabel="Todos"
            displayValue={getCycleTypeLabel}
          />
          <SingleSelectField
            id="drench-calendar-variety"
            label="Variedad"
            value={filters.variety}
            options={options.varieties}
            onChange={(value) => setFilters((current) => ({ ...current, variety: value }))}
            emptyLabel="Todas"
          />
          <SingleSelectField
            id="drench-calendar-area"
            label="Area"
            value={filters.areaId}
            options={options.areas}
            onChange={(value) => setFilters((current) => ({ ...current, areaId: value }))}
            emptyLabel="Todas"
          />
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-[16px] px-4"
            onClick={resetFilters}
          >
            <RefreshCcw className="mr-2 size-4" aria-hidden="true" />
            Restablecer
          </Button>
        </div>

        <KpiGrid columns={4}>
          <MetricTile
            label="Semana ISO objetivo"
            value={selectedWeek ? formatIsoWeekLabel(selectedWeek.isoWeekId) : "-"}
            hint={selectedWeek ? `${formatDate(selectedWeek.weekStartDate)} al ${formatDate(selectedWeek.weekEndDate)}` : "Sin semana seleccionada"}
            accent="default"
          />
          <MetricTile
            label="Fecha de publicacion"
            value={rows[0]?.publicationDate ? formatDate(rows[0].publicationDate) : "-"}
            hint={rows[0]?.publicationIsoWeekId ? `Publica desde ${formatIsoWeekLabel(rows[0].publicationIsoWeekId)}` : "Se publica el jueves de la semana anterior"}
            accent="success"
          />
          <MetricTile
            label="Jueves ancla"
            value={rows[0]?.anchorDate ? formatDate(rows[0].anchorDate) : "-"}
            hint="Fecha usada para resolver una sola semana fenologica por ISO week."
            accent="warning"
          />
          <MetricTile
            label="Semana fenologica observada"
            value={rows.length ? `${formatInteger(kpis.minWeek)} - ${formatInteger(kpis.maxWeek)}` : "-"}
            hint={rows.length ? `Rango dentro de ${formatCount(kpis.cycleCount, "ciclo", "ciclos")}` : "Sin ciclos proyectados para la semana"}
            accent="default"
          />
        </KpiGrid>
      </FilterPanel>

      <Card className="border-border/70 bg-card/90">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Pendiente del proyecto</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          <p>
            Anclar esta proyeccion a la base de vegetativo, que ya trae la calendarizacion operativa. Por ahora,
            la vista semanal usa solo calendario ISO oficial + <span className="font-medium text-foreground">sp_date</span>{" "}
            para derivar la semana fenologica. La migracion a planificacion diaria queda reservada para una fase futura.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.35fr]">
        <Card className="border-border/70 bg-card/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Resumen por grupo base</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedSummaries.length ? (
              groupedSummaries.map((group) => (
                <div
                  key={group.label}
                  className="rounded-[18px] border border-border/70 bg-background/70 px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">{group.label}</p>
                      <p className="text-xs text-muted-foreground">Variedad / Tipo SP</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{formatCount(group.cycleCount, "ciclo", "ciclos")}</p>
                      <p>{formatCount(group.blockCount, "bloque", "bloques")}</p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[14px] bg-slate-900/5 px-3 py-2 text-xs text-muted-foreground dark:bg-white/5">
                    Semana fenologica resuelta:{" "}
                    <span className="font-medium text-foreground">
                      {group.minWeek === group.maxWeek
                        ? `Semana ${group.minWeek}`
                        : `Semanas ${group.minWeek} a ${group.maxWeek}`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No hay grupos base para la semana ISO seleccionada." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/90">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Detalle calendarizado por ciclo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {rows.length ? (
              <div className="overflow-hidden rounded-[20px] border border-border/70">
                <div className="max-h-[640px] overflow-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                      <tr className="text-left text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        <th className="px-4 py-3 font-medium">Cycle ID</th>
                        <th className="px-4 py-3 font-medium">Bloque</th>
                        <th className="px-4 py-3 font-medium">Grupo base</th>
                        <th className="px-4 py-3 font-medium">Semana</th>
                        <th className="px-4 py-3 font-medium">Rango real</th>
                        <th className="px-4 py-3 font-medium">SP Date</th>
                        <th className="px-4 py-3 font-medium">Jueves ancla</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {rows.map((row) => (
                        <tr key={`${row.isoWeekId}:${row.cycleKey}`} className={cn(isLoading ? "animate-pulse" : "")}>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{row.cycleKey}</p>
                              <p className="text-xs text-muted-foreground">
                                Area {row.areaId ?? "-"} · {row.parentBlock ?? "-"}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{row.blockId}</p>
                              <p className="text-xs text-muted-foreground">
                                {row.variety} / {row.cycleTypeLabel}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{row.drenchGroupLabel}</p>
                              <p className="text-xs text-muted-foreground">{row.drenchGroupKey}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="text-base font-semibold tracking-tight text-foreground">
                                {formatInteger(row.phenologicalWeek)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatInteger(row.daysSinceSp)} dias desde SP
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">
                                {formatDate(row.phenologicalStartDate)} - {formatDate(row.phenologicalEndDate)}
                              </p>
                              <p className="text-xs text-muted-foreground">Semana real +7 - 1</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top text-foreground">{formatDate(row.spDate)}</td>
                          <td className="px-4 py-3 align-top">
                            <div className="space-y-1">
                              <p className="font-medium text-foreground">{formatDate(row.anchorDate)}</p>
                              <p className="text-xs text-muted-foreground">
                                Publica {formatDate(row.publicationDate)}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <EmptyState label="No hay ciclos calendarizados para esta combinacion de filtros." />
            )}
          </CardContent>
        </Card>
      </div>
    </SectionPageShell>
  );
}
