"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PersonInfoOverlay } from "@/components/dashboard/person-info-overlay";
import { MultiSelectField } from "@/shared/filters/multi-select-field";
import { DateField } from "@/shared/filters/date-field";
import { WeekField } from "@/shared/filters/week-field";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState as BaseEmptyState } from "@/shared/data-display/empty-state";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import { DialogShell } from "@/shared/overlays/dialog-shell";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { StandardTable, StandardTd, StandardTh } from "@/shared/tables/standard-table";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { formatWeekLabel, generateAvailableWeeks } from "@/lib/talento-humano-utils";
import { formatInteger, formatPercent } from "@/shared/lib/format";
import type {
  TalentoFilterOptions,
  TalentoFilters,
  TalentoPersonRecord,
} from "@/lib/talento-humano";

export const TALENTO_WEEKS = generateAvailableWeeks(2024);

export const TALENTO_WEEK_OPTIONS = TALENTO_WEEKS.map((w) => ({
  value: w,
  label: formatWeekLabel(w),
}));

export const BAR_COLORS = [
  "var(--chart-line-primary)",
  "var(--color-chart-success-bold)",
  "var(--color-chart-info-bold)",
  "var(--color-chart-warning)",
  "var(--chart-line-secondary)",
  "var(--color-chart-success)",
  "var(--color-chart-info)",
  "var(--color-chart-danger)",
];

export const TALENTO_COLORS = BAR_COLORS;

export type TalentoGroup<T extends TalentoPersonRecord = TalentoPersonRecord> = {
  label: string;
  count: number;
  people: T[];
};

export function buildTalentoQueryString(filters: TalentoFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => params.set(key, value));
  return params.toString();
}

export function groupTalentoRows<T extends TalentoPersonRecord>(
  rows: T[],
  key: keyof T,
  limit = 20,
): TalentoGroup<T>[] {
  const grouped = new Map<string, T[]>();

  for (const row of rows) {
    const value = row[key];
    const label = typeof value === "string" && value.trim() ? value : "Sin dato";
    const people = grouped.get(label) ?? [];
    people.push(row);
    grouped.set(label, people);
  }

  return Array.from(grouped.entries())
    .map(([label, people]) => ({ label, count: people.length, people }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "es-EC"))
    .slice(0, limit);
}

export { MetricTile } from "@/shared/data-display/metric-tile";
export { DateField } from "@/shared/filters/date-field";
export { WeekField } from "@/shared/filters/week-field";

type CommonFilterChange = <K extends keyof TalentoFilters>(key: K, value: TalentoFilters[K]) => void;

export function TalentoFilterToolbar({
  mode,
  filters,
  options,
  onFilterChange,
  onReset,
  onRefresh,
  refreshing,
  extraControls,
  containerless = false,
}: {
  mode: "snapshot" | "range";
  filters: TalentoFilters;
  options: TalentoFilterOptions;
  onFilterChange: CommonFilterChange;
  onReset: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  extraControls?: React.ReactNode;
  containerless?: boolean;
}) {
  const content = (
    <div className="space-y-4 overflow-visible px-0 py-0">
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
          {mode === "snapshot" ? (
            <DateField label="Día de corte" value={filters.snapshotDate} onChange={(value) => onFilterChange("snapshotDate", value)} />
          ) : (
            <>
              <WeekField label="Semana desde" value={filters.weekFrom} options={TALENTO_WEEK_OPTIONS} onChange={(value) => onFilterChange("weekFrom", value)} />
              <WeekField label="Semana hasta" value={filters.weekTo} options={TALENTO_WEEK_OPTIONS} onChange={(value) => onFilterChange("weekTo", value)} />
            </>
          )}
          {extraControls}
          <MultiSelectField id={`talento-filter-area-general-${mode}`} label="Área general" value={filters.areaGeneral} options={options.areaGenerals} onChange={(value) => onFilterChange("areaGeneral", value)} />
          <MultiSelectField id={`talento-filter-area-${mode}`} label="Área" value={filters.area} options={options.areas} onChange={(value) => onFilterChange("area", value)} />
          <MultiSelectField id={`talento-filter-cargo-${mode}`} label="Cargo" value={filters.jobTitle} options={options.jobTitles} onChange={(value) => onFilterChange("jobTitle", value)} />
          <MultiSelectField id={`talento-filter-clasificacion-${mode}`} label="Clasificación" value={filters.jobClassification} options={options.jobClassifications} onChange={(value) => onFilterChange("jobClassification", value)} />
          <MultiSelectField id={`talento-filter-ts-${mode}`} label="Trabajadora social" value={filters.associatedWorker} options={options.associatedWorkers} onChange={(value) => onFilterChange("associatedWorker", value)} />
          <MultiSelectField id={`talento-filter-genero-${mode}`} label="Género" value={filters.gender} options={options.genders} onChange={(value) => onFilterChange("gender", value)} />
          <MultiSelectField id={`talento-filter-estado-civil-${mode}`} label="Estado civil" value={filters.maritalStatus} options={options.maritalStatuses} onChange={(value) => onFilterChange("maritalStatus", value)} />
          <MultiSelectField id={`talento-filter-ciudad-${mode}`} label="Ciudad" value={filters.city} options={options.cities} onChange={(value) => onFilterChange("city", value)} />
        </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Restablecer
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={refreshing}>
          {refreshing ? "Cargando..." : "Actualizar"}
        </Button>
      </div>
    </div>
  );

  if (containerless) {
    return content;
  }

  return (
    <Card className="overflow-visible bg-card/90">
      <CardContent className="space-y-4 overflow-visible px-5 py-5">{content}</CardContent>
    </Card>
  );
}

type CompositionBucket = {
  label: string;
  value: number;
};

export type CompositionRow = {
  label: string;
  people: TalentoPersonRecord[];
  tenure: CompositionBucket[];
  gender: CompositionBucket[];
  age: CompositionBucket[];
};

export function buildCompositionRows(
  rows: TalentoPersonRecord[],
  key: keyof TalentoPersonRecord,
  asOfDate: string,
): CompositionRow[] {
  const asOfTime = new Date(`${asOfDate}T12:00:00`).getTime();
  const groups = groupTalentoRows(rows, key, 9999);
  return groups.map((group) => ({
    label: group.label,
    people: group.people,
    tenure: buildShareBuckets(group.people, (row) => getTenureBucket(row, asOfTime), ["1-30 dias", "31-90 dias", "91-180 dias", "181-360 dias", ">360 dias"]),
    gender: buildShareBuckets(group.people, getGenderBucket, ["Femenino", "Masculino"]),
    age: buildShareBuckets(group.people, (row) => getAgeBucket(row, asOfTime), ["<24", "24-30", "31-37", "38-42", "43-49", "50-56", ">56"]),
  }));
}

export function CompositionTable({
  title,
  dimensionLabel = "Variable",
  rows,
  asOfDate,
  onSelect,
}: {
  title: string;
  dimensionLabel?: string;
  rows: CompositionRow[];
  asOfDate: string;
  onSelect: (row: CompositionRow) => void;
}) {
  const total = rows.flatMap((row) => row.people);
  const asOfTime = new Date(`${asOfDate}T12:00:00`).getTime();
  const totalRow: CompositionRow = {
    label: "TOTAL",
    people: total,
    tenure: buildShareBuckets(total, (row) => getTenureBucket(row, asOfTime), ["1-30 dias", "31-90 dias", "91-180 dias", "181-360 dias", ">360 dias"]),
    gender: buildShareBuckets(total, getGenderBucket, ["Femenino", "Masculino"]),
    age: buildShareBuckets(total, (row) => getAgeBucket(row, asOfTime), ["<24", "24-30", "31-37", "38-42", "43-49", "50-56", ">56"]),
  };

  return (
    <ChartSurface title={title}>
      <ScrollFadeTable>
        <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr className="border-b border-border/30">
              <th rowSpan={2} className="sticky left-0 z-30 w-[210px] bg-card px-3 py-3 text-left text-xs font-semibold border-r border-border/40 align-bottom">{dimensionLabel}</th>
              <th rowSpan={2} className="sticky left-[210px] z-30 w-[120px] bg-card px-3 py-3 text-right text-xs font-semibold border-r-[2px] border-slate-700 dark:border-slate-200 align-bottom">Colaboradores</th>
              <th colSpan={5} className="border-l-[2px] border-l-slate-400 px-3 py-2.5 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">Antigüedad</th>
              <th colSpan={2} className="border-l-[2px] border-l-slate-400 px-3 py-2.5 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">Sexo</th>
              <th colSpan={7} className="border-l-[2px] border-l-slate-400 px-3 py-2.5 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">Edad</th>
            </tr>
            <tr className="border-b-2 border-border/50">
              {totalRow.tenure.map((bucket, index) => (
                <th key={bucket.label} className={`px-2.5 py-2 text-center text-[10px] font-medium text-muted-foreground/80 whitespace-nowrap bg-slate-100/70 dark:bg-slate-800/60 ${index === 0 ? "border-l-[2px] border-l-slate-400" : ""}`}>{bucket.label}</th>
              ))}
              {totalRow.gender.map((bucket, index) => (
                <th key={bucket.label} className={`px-2.5 py-2 text-center text-[10px] font-medium text-muted-foreground/80 whitespace-nowrap bg-slate-100/70 dark:bg-slate-800/60 ${index === 0 ? "border-l-[2px] border-l-slate-400" : ""}`}>{bucket.label}</th>
              ))}
              {totalRow.age.map((bucket, index) => (
                <th key={bucket.label} className={`px-2.5 py-2 text-center text-[10px] font-medium text-muted-foreground/80 whitespace-nowrap bg-slate-100/70 dark:bg-slate-800/60 ${index === 0 ? "border-l-[2px] border-l-slate-400" : ""}`}>{bucket.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <CompositionTableRow key={row.label} row={row} rowIndex={rowIndex} onClick={() => onSelect(row)} />
            ))}
            <CompositionTableRow row={totalRow} rowIndex={-1} total onClick={() => onSelect(totalRow)} />
          </tbody>
        </table>
      </ScrollFadeTable>
    </ChartSurface>
  );
}

function CompositionTableRow({
  row,
  rowIndex,
  total,
  onClick,
}: {
  row: CompositionRow;
  rowIndex: number;
  total?: boolean;
  onClick: () => void;
}) {
  const stickyBg = total ? "bg-muted/40" : rowIndex % 2 === 0 ? "bg-card" : "bg-muted/[0.06]";
  const rowExtra = total ? "font-semibold border-t border-border/40" : "";
  const cell = "px-2.5 py-2 text-center text-[11px]";

  return (
    <tr className={`group transition-colors hover:brightness-95 ${rowExtra}`}>
      <td className={`sticky left-0 z-10 ${stickyBg} px-3 py-2 text-left border-r border-border/30`}>
        <button type="button" className="text-left font-medium hover:underline" onClick={onClick}>{row.label}</button>
      </td>
      <td className={`sticky left-[210px] z-10 ${stickyBg} px-3 py-2 text-right border-r-[2px] border-slate-700 dark:border-slate-200`}>
        <button type="button" className="font-semibold tabular-nums hover:underline" onClick={onClick}>{formatInteger(row.people.length)}</button>
      </td>
      {row.tenure.map((bucket, index) => <HeatCell key={`tenure-${bucket.label}`} value={bucket.value} className={`${cell} ${index === 0 ? "border-l-[2px] border-l-slate-400" : ""}`} hue={215} />)}
      {row.gender.map((bucket, index) => <HeatCell key={`gender-${bucket.label}`} value={bucket.value} className={`${cell} ${index === 0 ? "border-l-[2px] border-l-slate-400" : ""}`} hue={165} />)}
      {row.age.map((bucket, index) => <HeatCell key={`age-${bucket.label}`} value={bucket.value} className={`${cell} ${index === 0 ? "border-l-[2px] border-l-slate-400" : ""}`} hue={40} />)}
    </tr>
  );
}

function HeatCell({ value, className, hue }: { value: number; className?: string; hue: number }) {
  return (
    <td className={className} style={{ backgroundColor: heatmapColor(value, hue) }}>
      <span className="tabular-nums text-[11px] font-medium text-foreground/88">{formatPercent(value, { input: "ratio" })}</span>
    </td>
  );
}

export function DistributionChart<T extends TalentoPersonRecord>({
  title,
  data,
  onSelect,
  colorOffset = 0,
}: {
  title: string;
  data: TalentoGroup<T>[];
  onSelect: (group: TalentoGroup<T>) => void;
  colorOffset?: number;
}) {
  const height = Math.max(220, Math.min(data.length * 34 + 70, 430));

  return (
    <ChartSurface title={title}>
      {data.length ? (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={132}
              tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: string) => (value.length > 18 ? `${value.slice(0, 17)}...` : value)}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.32 }}
              content={
                <RechartsTooltipAdapter
                  title={(label) => String(label)}
                  mapPayload={(payload) =>
                    payload.map((entry) => ({
                      label: "Personas",
                      value: typeof entry.value === "number" ? formatInteger(entry.value) : "0",
                    }))
                  }
                />
              }
            />
            <Bar
              dataKey="count"
              radius={[0, 8, 8, 0]}
              cursor="pointer"
              onClick={(entry: unknown) => {
                const group = (entry as { payload?: TalentoGroup<T> }).payload;
                if (group) onSelect(group);
              }}
            >
              {data.map((entry, index) => (
                <Cell key={entry.label} fill={BAR_COLORS[(colorOffset + index) % BAR_COLORS.length]} fillOpacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState label="Sin datos para graficar." />
      )}
    </ChartSurface>
  );
}

export function DistributionSummaryCard<T extends TalentoPersonRecord>({
  title,
  data,
  onSelect,
}: {
  title: string;
  data: TalentoGroup<T>[];
  onSelect: (group: TalentoGroup<T>) => void;
}) {
  const total = data.reduce((sum, group) => sum + group.count, 0);
  const top = data.slice(0, 6);
  const dominant = top[0];

  return (
    <ChartSurface title={title}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold tracking-tight">{dominant ? formatInteger(dominant.count) : "0"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Mayor concentración</p>
        </div>
        <div className="grid size-16 place-items-center rounded-full border-4 border-slate-400 bg-background text-center text-[10px] font-semibold dark:border-slate-500">
          {dominant ? formatPercent(total ? dominant.count / total : 0, { input: "ratio" }) : "-"}
        </div>
      </div>
      {dominant ? (
        <button type="button" className="mt-3 max-w-full truncate text-left text-sm font-medium hover:underline" onClick={() => onSelect(dominant)}>
          {dominant.label}
        </button>
      ) : null}
      <div className="mt-4 grid gap-2">
        {top.map((group, index) => (
          <button
            type="button"
            key={group.label}
            className="flex items-center justify-between gap-3 rounded-[12px] border border-border/60 bg-background/60 px-3 py-2 text-left hover:bg-muted/35"
            onClick={() => onSelect(group)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }} />
              <span className="truncate text-xs font-medium">{group.label}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatInteger(group.count)} · {formatPercent(total ? group.count / total : 0, { input: "ratio" })}
            </span>
          </button>
        ))}
      </div>
    </ChartSurface>
  );
}

export function PersonListModal<T extends TalentoPersonRecord>({
  title,
  people,
  onClose,
}: {
  title: string;
  people: T[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<T | null>(null);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) => person.personId.toLowerCase().includes(term) || person.personName.toLowerCase().includes(term));
  }, [people, search]);

  return (
    <>
      <DialogShell
        title={title}
        description={`${people.length} personas`}
        onClose={onClose}
        maxWidth="max-w-3xl"
        headerActions={
          <button type="button" onClick={onClose} className="rounded-[10px] p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cerrar listado">
            <X className="size-4" />
          </button>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o ID..." className="pl-8" />
          </div>
          {filteredPeople.length ? (
            <ScrollFadeTable>
              <StandardTable>
                <thead className="border-b border-border/70">
                  <tr>
                    <StandardTh>ID</StandardTh>
                    <StandardTh>Nombre</StandardTh>
                    <StandardTh>Área</StandardTh>
                    <StandardTh>Género</StandardTh>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.map((person, index) => (
                    <tr key={`${person.personId}-${person.areaId}-${index}`} className="cursor-pointer border-b border-border/50 last:border-0 hover:bg-muted/30" onClick={() => setSelectedPerson(person)}>
                      <StandardTd className="text-xs text-muted-foreground">{person.personId}</StandardTd>
                      <StandardTd className="text-xs font-medium">{person.personName}</StandardTd>
                      <StandardTd className="max-w-[180px] truncate text-xs text-muted-foreground">{person.areaName}</StandardTd>
                      <StandardTd className="text-xs text-muted-foreground">{person.gender ?? "-"}</StandardTd>
                    </tr>
                  ))}
                </tbody>
              </StandardTable>
            </ScrollFadeTable>
          ) : (
            <EmptyState label="Sin resultados." />
          )}
        </div>
      </DialogShell>
      {selectedPerson ? <PersonInfoOverlay personId={selectedPerson.personId} personName={selectedPerson.personName} onClose={() => setSelectedPerson(null)} /> : null}
    </>
  );
}

export function DonutChart<T extends TalentoPersonRecord>({
  title,
  data,
  onSelect,
}: {
  title: string;
  data: TalentoGroup<T>[];
  onSelect: (group: TalentoGroup<T>) => void;
}) {
  const top = data.slice(0, 6);
  const total = data.reduce((s, g) => s + g.count, 0);

  return (
    <ChartSurface title={title}>
      {top.length ? (
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <PieChart width={160} height={160}>
              <Pie
                data={top}
                dataKey="count"
                nameKey="label"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={2}
                onClick={(entry: unknown) => {
                  const group = (entry as { payload?: TalentoGroup<T> }).payload;
                  if (group) onSelect(group);
                }}
                cursor="pointer"
              >
                {top.map((entry, index) => (
                  <Cell key={entry.label} fill={TALENTO_COLORS[index % TALENTO_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={
                  <RechartsTooltipAdapter
                    title={(label) => String(label)}
                    mapPayload={(payload) =>
                      payload.map((entry) => ({
                        label: "Personas",
                        value: typeof entry.value === "number" ? formatInteger(entry.value) : "0",
                      }))
                    }
                  />
                }
              />
            </PieChart>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {top.map((entry, index) => (
              <button key={entry.label} type="button" className="flex items-center justify-between gap-2 text-left hover:opacity-75" onClick={() => onSelect(entry)}>
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: TALENTO_COLORS[index % TALENTO_COLORS.length] }} />
                  <span className="truncate text-xs">{entry.label}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{formatPercent(total ? entry.count / total : 0, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState label="Sin datos." />
      )}
    </ChartSurface>
  );
}

export function EmptyState({ label = "No hay datos para el periodo seleccionado." }: { label?: string }) {
  return <BaseEmptyState label={label} />;
}

function buildShareBuckets<T extends TalentoPersonRecord>(
  rows: T[],
  bucketFn: (row: T) => string | null,
  order: string[],
): CompositionBucket[] {
  const counts = new Map<string, number>(order.map((label) => [label, 0]));
  rows.forEach((row) => {
    const bucket = bucketFn(row);
    if (!bucket) return;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  });
  const total = rows.length || 1;
  return order.map((label) => ({ label, value: (counts.get(label) ?? 0) / total }));
}

function getAgeBucket(row: TalentoPersonRecord, asOfTime: number) {
  if (!row.birthDate) return null;
  const birth = new Date(row.birthDate).getTime();
  if (!Number.isFinite(birth)) return null;
  const age = (asOfTime - birth) / 31557600000;
  if (age < 24) return "<24";
  if (age <= 30) return "24-30";
  if (age <= 37) return "31-37";
  if (age <= 42) return "38-42";
  if (age <= 49) return "43-49";
  if (age <= 56) return "50-56";
  return ">56";
}

function getTenureBucket(row: TalentoPersonRecord, asOfTime: number) {
  if (!row.lastEntryDate) return null;
  const days = Math.floor((asOfTime - new Date(row.lastEntryDate).getTime()) / 86400000);
  if (!Number.isFinite(days)) return null;
  if (days <= 30) return "1-30 dias";
  if (days <= 90) return "31-90 dias";
  if (days <= 180) return "91-180 dias";
  if (days <= 360) return "181-360 dias";
  return ">360 dias";
}

function getGenderBucket(row: TalentoPersonRecord) {
  const value = row.gender?.trim().toUpperCase();
  if (!value) return null;
  if (value.startsWith("F")) return "Femenino";
  if (value.startsWith("M")) return "Masculino";
  return null;
}

function heatmapColor(value: number, hue: number) {
  const percent = Math.max(0, Math.min(1, value));
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const saturation = isDark ? 28 : 34;
  const lightness = isDark ? 21 + percent * 25 : 97 - percent * 28;
  const alpha = isDark ? 0.34 + percent * 0.28 : 0.42 + percent * 0.26;
  return `hsl(${hue} ${saturation}% ${lightness}% / ${alpha})`;
}
