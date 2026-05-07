"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { TalentoExitRecord } from "@/lib/talento-humano";
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
import { formatDecimal, formatInteger, formatPercent } from "@/shared/lib/format";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { BAR_COLORS } from "@/modules/talento-humano/components/talento-view-utils";

export type ExitGroup = {
  label: string;
  count: number;
  rows: TalentoExitRecord[];
  avgCompliance: number | null;
};

export type CrossGroup = ExitGroup & {
  buckets: Array<{ label: string; count: number; ratio: number; rows: TalentoExitRecord[] }>;
};

export function getComplianceTone(value: number | null) {
  if (value === null) return "neutral";
  if (value > 1) return "success";
  if (value >= 0.9) return "warning";
  return "danger";
}

export function toneClass(tone: ReturnType<typeof getComplianceTone>) {
  if (tone === "success") return "text-[var(--color-chart-success-bold)]";
  if (tone === "warning") return "text-[var(--color-chart-warning)]";
  if (tone === "danger") return "text-[var(--color-chart-danger)]";
  return "text-muted-foreground";
}

export function BarListCard({
  title,
  subtitle,
  groups,
  onSelect,
  showCompliance = false,
}: {
  title: string;
  subtitle?: string;
  groups: ExitGroup[];
  onSelect: (group: ExitGroup) => void;
  showCompliance?: boolean;
}) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);

  return (
    <ChartSurface title={title} subtitle={subtitle}>
      {groups.length ? (
        <div className="space-y-3">
          {groups.map((group, index) => {
            const ratio = total ? group.count / total : 0;
            const tone = getComplianceTone(group.avgCompliance);
            return (
              <button key={group.label} type="button" className="grid w-full grid-cols-[minmax(110px,0.95fr)_minmax(150px,1.25fr)_auto] items-center gap-3 rounded-[14px] px-2 py-1.5 text-left text-xs transition hover:bg-muted/55" onClick={() => onSelect(group)}>
                <span className="min-w-0 truncate font-medium">{group.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(2, ratio * 100)}%`, background: BAR_COLORS[index % BAR_COLORS.length] }} />
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums">
                  {formatPercent(ratio, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({formatInteger(group.count)})
                  {showCompliance ? <span className={cn("ml-2", toneClass(tone))}>{formatPercent(group.avgCompliance, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState label="Sin datos disponibles para los filtros seleccionados." />
      )}
    </ChartSurface>
  );
}

export function DonutBreakdownCard({
  title,
  groups,
  onSelect,
}: {
  title: string;
  groups: ExitGroup[];
  onSelect: (group: ExitGroup) => void;
}) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);
  const topGroups = groups.slice(0, 7);
  let cursor = 0;
  const gradient = topGroups.length
    ? topGroups.map((group, index) => {
      const start = cursor;
      cursor += total ? (group.count / total) * 100 : 0;
      return `${BAR_COLORS[index % BAR_COLORS.length]} ${start}% ${cursor}%`;
    }).join(", ")
    : "var(--muted) 0 100%";

  return (
    <ChartSurface title={title} subtitle="Porcentaje y cantidad por respuesta. Click para ver personas.">
      {groups.length ? (
        <div className="grid gap-6 2xl:grid-cols-[220px_minmax(0,1fr)]">
          <div className="mx-auto grid size-52 place-items-center rounded-full border border-border/70 shadow-inner" style={{ background: `conic-gradient(${gradient})` }}>
            <div className="grid size-32 place-items-center rounded-full bg-card text-center text-sm font-semibold shadow-sm">
              {formatInteger(total)}
              <span className="block text-xs font-normal text-muted-foreground">salidas</span>
            </div>
          </div>
          <div className="grid content-start gap-2.5">
            {topGroups.map((group, index) => {
              const ratio = total ? group.count / total : 0;
              return (
                <button key={group.label} type="button" onClick={() => onSelect(group)} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[16px] border border-border/60 bg-background/70 px-4 py-3 text-left transition hover:border-primary/35 hover:bg-muted/45">
                  <span className="size-2.5 rounded-full" style={{ background: BAR_COLORS[index % BAR_COLORS.length] }} />
                  <span className="min-w-0 truncate text-sm font-medium">{group.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatPercent(ratio, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })} · {formatInteger(group.count)}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState label="Sin datos disponibles para los filtros seleccionados." />
      )}
    </ChartSurface>
  );
}

export function ContingencyTableCard({
  title,
  subtitle,
  groups,
  onSelect,
}: {
  title: string;
  subtitle?: string;
  groups: CrossGroup[];
  onSelect: (group: ExitGroup) => void;
}) {
  const columns = buildColumns(groups);

  return (
    <ChartSurface title={title} subtitle={subtitle}>
      {groups.length && columns.length ? (
        <ScrollFadeTable
          className="border border-border/60 bg-background/55"
          innerClassName="rounded-[16px]"
          topScrollbar
        >
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-xs">
            <thead>
              <tr>
                <Th>Grupo</Th>
                {columns.map((column) => <Th key={column} align="right">{column}</Th>)}
                <Th align="right">Total</Th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.label} className="cursor-pointer hover:bg-muted/35" onClick={() => onSelect(group)}>
                  <Td strong>{group.label}</Td>
                  {columns.map((column) => {
                    const bucket = group.buckets.find((entry) => entry.label === column);
                    return (
                      <HeatTd key={column} bucket={bucket}>
                        {bucket ? (
                          <>
                            <span className="font-semibold text-foreground">{formatInteger(bucket.count)}</span>
                            <span className="ml-1 text-muted-foreground">{formatPercent(bucket.ratio, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          </>
                        ) : "-"}
                      </HeatTd>
                    );
                  })}
                  <Td align="right" strong>{formatInteger(group.count)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollFadeTable>
      ) : (
        <EmptyState label="Sin datos para cruzar variables." />
      )}
    </ChartSurface>
  );
}

export function SocialWorkerContingencyCard({
  groups,
  onSelect,
}: {
  groups: Array<CrossGroup & { complianceBuckets: CrossGroup["buckets"]; tenureBuckets: CrossGroup["buckets"] }>;
  onSelect: (group: ExitGroup) => void;
}) {
  return (
    <ChartSurface title="Trabajadora social vs motivo, cumplimiento y antigüedad" subtitle="Tablas de contingencia por TS asignada. Cada celda muestra cantidad y peso dentro de la fila.">
      {groups.length ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,560px),1fr))] gap-4">
          <WorkerHeatMatrix title="TS x motivo" groups={groups.map((group) => ({ ...group, buckets: group.buckets }))} onSelect={onSelect} />
          <WorkerHeatMatrix title="TS x cumplimiento" groups={groups.map((group) => ({ ...group, buckets: group.complianceBuckets }))} onSelect={onSelect} />
          <WorkerHeatMatrix title="TS x antigüedad" groups={groups.map((group) => ({ ...group, buckets: group.tenureBuckets }))} onSelect={onSelect} />
        </div>
      ) : (
        <EmptyState label="Sin TS asignadas para los filtros seleccionados." />
      )}
    </ChartSurface>
  );
}

function WorkerHeatMatrix({
  title,
  groups,
  onSelect,
}: {
  title: string;
  groups: CrossGroup[];
  onSelect: (group: ExitGroup) => void;
}) {
  const columns = buildColumns(groups, 7);
  return (
    <div className="min-w-0 rounded-[20px] border border-border/60 bg-background/70 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">{formatInteger(groups.reduce((sum, group) => sum + group.count, 0))} salidas</span>
      </div>
      <ScrollFadeTable innerClassName="rounded-[16px]" topScrollbar>
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <Th>TS</Th>
              {columns.map((column) => <Th key={column} align="right">{column}</Th>)}
              <Th align="right">Total</Th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.label} className="cursor-pointer hover:bg-muted/35" onClick={() => onSelect(group)}>
                <Td strong>{group.label}</Td>
                {columns.map((column) => {
                  const bucket = group.buckets.find((entry) => entry.label === column);
                  return (
                    <HeatTd key={column} bucket={bucket}>
                      {bucket ? (
                        <span className="inline-flex flex-col items-end leading-tight">
                          <span className="font-semibold text-foreground">{formatInteger(bucket.count)}</span>
                          <span className="text-[10px] text-muted-foreground">{formatPercent(bucket.ratio, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </span>
                      ) : "-"}
                    </HeatTd>
                  );
                })}
                <Td align="right" strong>{formatInteger(group.count)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollFadeTable>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className={cn("border-b border-border/70 px-3 py-2 font-semibold uppercase tracking-[0.14em] text-muted-foreground", align === "right" && "text-right")}>{children}</th>;
}

function Td({ children, align = "left", strong = false }: { children: React.ReactNode; align?: "left" | "right"; strong?: boolean }) {
  return <td className={cn("border-b border-border/45 px-3 py-2.5 text-muted-foreground", align === "right" && "text-right tabular-nums", strong && "font-medium text-foreground")}>{children}</td>;
}

function HeatTd({ children, bucket }: { children: React.ReactNode; bucket?: CrossGroup["buckets"][number] }) {
  const alpha = bucket ? 0.08 + Math.min(bucket.ratio, 1) * 0.22 : 0;
  return (
    <td className="border-b border-border/45 px-3 py-2.5 text-right tabular-nums" style={{ background: bucket ? `color-mix(in oklab, var(--color-chart-info-bold) ${Math.round(alpha * 100)}%, transparent)` : undefined }}>
      {children}
    </td>
  );
}

function buildColumns(groups: CrossGroup[], limit = 6) {
  const counts = new Map<string, number>();
  for (const group of groups) {
    for (const bucket of group.buckets) {
      counts.set(bucket.label, (counts.get(bucket.label) ?? 0) + bucket.count);
    }
  }
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], "es-EC"))
    .slice(0, limit)
    .map(([label]) => label);
}

// ─── Charts canon — variedad visual ──────────────────────────────────────────

const MONTH_LABEL: Record<number, string> = {
  1: "Ene",
  2: "Feb",
  3: "Mar",
  4: "Abr",
  5: "May",
  6: "Jun",
  7: "Jul",
  8: "Ago",
  9: "Sep",
  10: "Oct",
  11: "Nov",
  12: "Dic",
};

function monthShort(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const mLabel = MONTH_LABEL[Number(month)] ?? month ?? "";
  return year ? `${mLabel} ${year.slice(-2)}` : (mLabel ?? yearMonth);
}

/**
 * Tendencia mensual de salidas como `AreaChart` con gradient. Muestra el
 * volumen de desvinculaciones por mes para detectar picos estacionales.
 */
export function ExitTimeSeriesCard({ rows }: { rows: TalentoExitRecord[] }) {
  const points = useMemo(() => {
    const buckets = new Map<string, { exits: number; cumplimientoSum: number; cumplimientoCount: number }>();
    for (const row of rows) {
      if (!row.exitDate) continue;
      const key = row.exitDate.slice(0, 7); // YYYY-MM
      const entry = buckets.get(key) ?? { exits: 0, cumplimientoSum: 0, cumplimientoCount: 0 };
      entry.exits += 1;
      if (typeof row.cumplimiento === "number" && Number.isFinite(row.cumplimiento)) {
        entry.cumplimientoSum += row.cumplimiento;
        entry.cumplimientoCount += 1;
      }
      buckets.set(key, entry);
    }
    return Array.from(buckets.entries())
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entry]) => ({
        key,
        label: monthShort(key),
        exits: entry.exits,
        avgCompliance:
          entry.cumplimientoCount > 0 ? entry.cumplimientoSum / entry.cumplimientoCount : null,
      }));
  }, [rows]);

  return (
    <ChartSurface
      title="Tendencia mensual de salidas"
      subtitle="Volumen de desvinculaciones por mes en el periodo filtrado"
    >
      {points.length === 0 ? (
        <EmptyState label="Sin datos suficientes para construir una serie temporal." />
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 12, right: 24, left: 8, bottom: 16 }}>
              <defs>
                <linearGradient id="exitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-chart-info-bold)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--color-chart-info-bold)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridConfig} />
              <XAxis
                dataKey="label"
                {...axisConfig}
                tick={axisTickStyleCompact}
                interval="preserveStartEnd"
                minTickGap={20}
              />
              <YAxis
                {...axisConfig}
                tick={axisTickStyle}
                allowDecimals={false}
                tickFormatter={(value: number) => formatInteger(value)}
              />
              <Tooltip
                cursor={tooltipCursorStyle}
                content={
                  <RechartsTooltipAdapter
                    title={(label) => String(label)}
                    mapPayload={(payload) => {
                      const row = payload[0]?.payload as
                        | { exits?: number; avgCompliance?: number | null }
                        | undefined;
                      return [
                        { label: "Salidas", value: formatInteger(row?.exits ?? 0) },
                        {
                          label: "Cumplimiento prom.",
                          value:
                            row?.avgCompliance == null
                              ? "—"
                              : formatPercent(row.avgCompliance, {
                                  input: "ratio",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 1,
                                }),
                        },
                      ];
                    }}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="exits"
                stroke="var(--color-chart-info-bold)"
                strokeWidth={2}
                fill="url(#exitFill)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartSurface>
  );
}

/**
 * `BarChart` vertical canon — alternativa al `BarListCard` para reflejar
 * jerarquía cuantitativa con ejes y tooltip Recharts. Útil para top-N motivos.
 */
export function ExitVerticalBarCard({
  title,
  subtitle,
  groups,
  onSelect,
  colorOffset = 0,
}: {
  title: string;
  subtitle?: string;
  groups: ExitGroup[];
  onSelect: (group: ExitGroup) => void;
  colorOffset?: number;
}) {
  const data = groups.map((group, index) => ({
    label: group.label,
    short: group.label.length > 18 ? `${group.label.slice(0, 18)}…` : group.label,
    count: group.count,
    avgCompliance: group.avgCompliance,
    color: BAR_COLORS[(index + colorOffset) % BAR_COLORS.length] ?? "var(--color-chart-info-bold)",
    payload: group,
  }));

  return (
    <ChartSurface title={title} subtitle={subtitle}>
      {data.length === 0 ? (
        <EmptyState label="Sin datos para los filtros aplicados." />
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 12, right: 16, left: 8, bottom: 16 }} barCategoryGap={14}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                dataKey="short"
                {...axisConfig}
                tick={axisTickStyleCompact}
                interval={0}
                angle={-28}
                textAnchor="end"
                height={84}
              />
              <YAxis
                {...axisConfig}
                tick={axisTickStyle}
                allowDecimals={false}
                tickFormatter={(value: number) => formatInteger(value)}
              />
              <Tooltip
                cursor={tooltipCursorStyle}
                content={
                  <RechartsTooltipAdapter
                    title={(_label, payload) =>
                      String((payload?.[0]?.payload as { label?: string } | undefined)?.label ?? "")
                    }
                    mapPayload={(payload) => {
                      const row = payload[0]?.payload as
                        | { count?: number; avgCompliance?: number | null }
                        | undefined;
                      return [
                        { label: "Salidas", value: formatInteger(row?.count ?? 0) },
                        {
                          label: "Cumplimiento prom.",
                          value:
                            row?.avgCompliance == null
                              ? "—"
                              : formatPercent(row.avgCompliance, {
                                  input: "ratio",
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }),
                        },
                      ];
                    }}
                  />
                }
              />
              <Bar
                dataKey="count"
                radius={[8, 8, 0, 0]}
                cursor="pointer"
                onClick={(payload) => {
                  const group = (payload as { payload?: ExitGroup })?.payload;
                  if (group) onSelect(group);
                }}
              >
                {data.map((point) => (
                  <Cell key={point.label} fill={point.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartSurface>
  );
}

/**
 * Scatter interpretativo de antigüedad (meses al salir) × cumplimiento (rend
 * real / mínimo). Diseñado para que un psicólogo o gerente identifique en un
 * vistazo en qué cuadrante "vive" cada salida:
 *
 * - 🟢 II  (alto cumplim. + corta antigüedad) → "Pérdida temprana de talento"
 * - 🟢 I   (alto cumplim. + larga antigüedad) → "Cierre natural de ciclo"
 * - 🟠 III (bajo cumplim. + corta antigüedad) → "Mala adaptación / selección"
 * - 🔴 IV  (bajo cumplim. + larga antigüedad) → "Desgaste prolongado"
 *
 * Umbrales canon: 100% cumplimiento (eje horizontal de referencia) y
 * 12 meses de antigüedad (eje vertical de referencia).
 */
const SCATTER_TENURE_THRESHOLD = 12; // meses
const SCATTER_COMPLIANCE_THRESHOLD = 1; // ratio = 100%

export function ExitScatterCard({ rows }: { rows: TalentoExitRecord[] }) {
  const points = useMemo(
    () =>
      rows.flatMap((row) => {
        if (typeof row.activeMonths !== "number" || typeof row.cumplimiento !== "number") {
          return [];
        }
        const cumplimiento = row.cumplimiento;
        const tone = getComplianceTone(cumplimiento);
        const color =
          tone === "success"
            ? "var(--color-chart-success-bold)"
            : tone === "warning"
              ? "var(--color-chart-warning)"
              : tone === "danger"
                ? "var(--color-chart-danger)"
                : "var(--color-chart-neutral)";
        return [
          {
            x: row.activeMonths,
            y: cumplimiento,
            personName: row.personName,
            exitReason: row.exitReason ?? "Sin dato",
            color,
          },
        ];
      }),
    [rows],
  );

  const xMax = useMemo(() => {
    const maxValue = points.reduce((max, point) => Math.max(max, point.x), 0);
    return Math.max(maxValue, SCATTER_TENURE_THRESHOLD * 2);
  }, [points]);
  const yMax = useMemo(() => {
    const maxValue = points.reduce((max, point) => Math.max(max, point.y), 0);
    return Math.max(maxValue, 1.5);
  }, [points]);

  // Conteos por cuadrante para resumen interpretativo bajo el chart.
  const quadrants = useMemo(() => {
    const counts = { earlyHigh: 0, lateHigh: 0, earlyLow: 0, lateLow: 0 };
    for (const p of points) {
      const lateTenure = p.x >= SCATTER_TENURE_THRESHOLD;
      const highCompliance = p.y >= SCATTER_COMPLIANCE_THRESHOLD;
      if (highCompliance && !lateTenure) counts.earlyHigh += 1;
      else if (highCompliance && lateTenure) counts.lateHigh += 1;
      else if (!highCompliance && !lateTenure) counts.earlyLow += 1;
      else counts.lateLow += 1;
    }
    return counts;
  }, [points]);

  return (
    <ChartSurface
      title="Mapa de salidas: antigüedad × cumplimiento"
      subtitle="Cada punto es una persona desvinculada. Las líneas dividen 4 cuadrantes interpretativos: 100% cumplimiento (eje horizontal) y 12 meses de antigüedad (eje vertical)"
    >
      {points.length === 0 ? (
        <EmptyState label="Sin pares (antigüedad, cumplimiento) suficientes." />
      ) : (
        <>
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 24, left: 8, bottom: 24 }}>
                <CartesianGrid {...gridConfig} />
                {/* Cuadrantes coloreados sutilmente */}
                <ReferenceArea
                  x1={0}
                  x2={SCATTER_TENURE_THRESHOLD}
                  y1={SCATTER_COMPLIANCE_THRESHOLD}
                  y2={yMax}
                  fill="var(--color-chart-success)"
                  fillOpacity={0.08}
                />
                <ReferenceArea
                  x1={SCATTER_TENURE_THRESHOLD}
                  x2={xMax}
                  y1={SCATTER_COMPLIANCE_THRESHOLD}
                  y2={yMax}
                  fill="var(--color-chart-success)"
                  fillOpacity={0.04}
                />
                <ReferenceArea
                  x1={0}
                  x2={SCATTER_TENURE_THRESHOLD}
                  y1={0}
                  y2={SCATTER_COMPLIANCE_THRESHOLD}
                  fill="var(--color-chart-warning)"
                  fillOpacity={0.06}
                />
                <ReferenceArea
                  x1={SCATTER_TENURE_THRESHOLD}
                  x2={xMax}
                  y1={0}
                  y2={SCATTER_COMPLIANCE_THRESHOLD}
                  fill="var(--color-chart-danger)"
                  fillOpacity={0.06}
                />
                <ReferenceLine
                  x={SCATTER_TENURE_THRESHOLD}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  label={{
                    value: "12 meses",
                    position: "insideTopRight",
                    fill: "var(--color-muted-foreground)",
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={SCATTER_COMPLIANCE_THRESHOLD}
                  stroke="var(--color-border)"
                  strokeDasharray="4 4"
                  label={{
                    value: "100% meta",
                    position: "insideBottomRight",
                    fill: "var(--color-muted-foreground)",
                    fontSize: 10,
                  }}
                />
                <XAxis
                  dataKey="x"
                  type="number"
                  name="Antigüedad"
                  domain={[0, xMax]}
                  {...axisConfig}
                  tick={axisTickStyleCompact}
                  tickFormatter={(value: number) => `${formatDecimal(value, 0)} m`}
                  label={{
                    value: "Antigüedad al salir (meses)",
                    position: "insideBottom",
                    offset: -8,
                    fill: "var(--color-muted-foreground)",
                    fontSize: 11,
                  }}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="Cumplimiento"
                  domain={[0, yMax]}
                  {...axisConfig}
                  tick={axisTickStyle}
                  tickFormatter={(value: number) =>
                    formatPercent(value, {
                      input: "ratio",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })
                  }
                  label={{
                    value: "Cumplimiento (rend / mínimo)",
                    angle: -90,
                    position: "insideLeft",
                    fill: "var(--color-muted-foreground)",
                    fontSize: 11,
                    offset: 12,
                  }}
                />
                <ZAxis range={[60, 100]} />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3", stroke: "var(--color-border)" }}
                  content={
                    <RechartsTooltipAdapter
                      title={(_label, payload) =>
                        String(
                          (payload?.[0]?.payload as { personName?: string } | undefined)?.personName
                            ?? "",
                        )
                      }
                      mapPayload={(payload) => {
                        const row = payload[0]?.payload as
                          | { x?: number; y?: number; exitReason?: string }
                          | undefined;
                        return [
                          {
                            label: "Antigüedad",
                            value: row?.x == null ? "—" : `${formatDecimal(row.x, 1)} meses`,
                          },
                          {
                            label: "Cumplimiento",
                            value:
                              row?.y == null
                                ? "—"
                                : formatPercent(row.y, {
                                    input: "ratio",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 1,
                                  }),
                          },
                          { label: "Motivo", value: row?.exitReason ?? "—" },
                        ];
                      }}
                    />
                  }
                />
                <Scatter data={points} isAnimationActive={false}>
                  {points.map((point) => (
                    <Cell
                      key={`scatter-${point.personName}-${point.x}-${point.y}`}
                      fill={point.color}
                      fillOpacity={0.78}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <ScatterQuadrantLegend
            quadrants={quadrants}
            total={points.length}
          />
        </>
      )}
    </ChartSurface>
  );
}

/**
 * Pequeña leyenda 2×2 con conteos por cuadrante para que cualquier persona
 * pueda interpretar el scatter sin tener que leer ejes.
 */
function ScatterQuadrantLegend({
  quadrants,
  total,
}: {
  quadrants: { earlyHigh: number; lateHigh: number; earlyLow: number; lateLow: number };
  total: number;
}) {
  const items = [
    {
      key: "earlyHigh",
      label: "Pérdida temprana de talento",
      hint: "Alto cumplimiento + corta antigüedad",
      count: quadrants.earlyHigh,
      tone: "var(--color-chart-success-bold)",
    },
    {
      key: "lateHigh",
      label: "Cierre natural de ciclo",
      hint: "Alto cumplimiento + larga antigüedad",
      count: quadrants.lateHigh,
      tone: "var(--color-chart-success)",
    },
    {
      key: "earlyLow",
      label: "Mala adaptación / selección",
      hint: "Bajo cumplimiento + corta antigüedad",
      count: quadrants.earlyLow,
      tone: "var(--color-chart-warning)",
    },
    {
      key: "lateLow",
      label: "Desgaste prolongado",
      hint: "Bajo cumplimiento + larga antigüedad",
      count: quadrants.lateLow,
      tone: "var(--color-chart-danger)",
    },
  ] as const;

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const ratio = total > 0 ? item.count / total : 0;
        return (
          <div
            key={item.key}
            className="rounded-[16px] border border-border/60 bg-background/55 px-3 py-2.5"
          >
            <div className="flex items-start gap-2.5">
              <span
                className="mt-1 size-2.5 shrink-0 rounded-full"
                style={{ background: item.tone }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-foreground">{item.label}</p>
                  <p className="text-[12px] tabular-nums text-muted-foreground">
                    {formatInteger(item.count)} ·{" "}
                    {formatPercent(ratio, {
                      input: "ratio",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground">{item.hint}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
