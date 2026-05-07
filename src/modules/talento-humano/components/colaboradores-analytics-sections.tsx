"use client";

import { useMemo, useState } from "react";
import type React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/utils";
import type { CollaboratorDetailPayload } from "@/lib/talento-humano-colaboradores";
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
import { KpiGrid } from "@/shared/layout/filter-panel";
import { formatDate, formatFlexibleNumber, formatPercent } from "@/shared/lib/format";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  getComplianceTone,
  toneClass,
} from "@/modules/talento-humano/components/desvinculacion-charts";
import { Activity, ChevronDown, ChevronRight } from "lucide-react";

type PerformanceData = NonNullable<CollaboratorDetailPayload["performance"]>;
type AbsenteeismData = NonNullable<CollaboratorDetailPayload["absenteeism"]>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(value: number | null | undefined) {
  return value == null
    ? "—"
    : formatPercent(value, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function flex(value: number | null | undefined) {
  if (value == null) return "—";
  return formatFlexibleNumber(value);
}

function dateVal(value: string | null | undefined) {
  return value ? formatDate(value) : "—";
}

function ratioOrNull(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function complianceColor(value: number | null | undefined) {
  if (value == null) return "var(--color-chart-neutral)";
  if (value >= 1) return "var(--color-chart-success-bold)";
  if (value >= 0.9) return "var(--color-chart-warning)";
  return "var(--color-chart-danger)";
}

/**
 * Detecta si una unidad de medida es "H Normales" (presencia sin rendimiento
 * medible). Acepta variantes con/sin tildes y casing. Las filas con unidad
 * vacía o "—" deben filtrarse upstream.
 */
function isHoursOnlyUnit(unit: string | null | undefined): boolean {
  if (!unit) return false;
  const normalized = unit.trim().toLowerCase();
  if (!normalized || normalized === "-" || normalized === "—") return false;
  return (
    normalized === "h normales"
    || normalized === "h normal"
    || normalized === "horas normales"
    || normalized === "hn"
  );
}

function complianceAccent(
  value: number | null | undefined,
): "default" | "success" | "warning" | "danger" {
  if (value == null) return "default";
  if (value >= 1) return "success";
  if (value >= 0.9) return "warning";
  return "danger";
}

function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}

// ─── Cumplimiento semanal (line chart elegante) ──────────────────────────────

/**
 * Tendencia de cumplimiento semanal como `LineChart`. Reemplaza el `BarChart`
 * canónico con una visualización más estilizada porque el usuario pidió esta
 * variante específica para Colaboradores. El resto del repo sigue usando bars
 * para cumplimiento ponderado (Productividad, Mortalidad).
 *
 * - Stroke `var(--color-chart-success-bold)` + dots con tono por threshold
 * - Línea horizontal de referencia al 100% (`--color-chart-success`)
 * - Tooltip canon con semana + cumplimiento + rendimiento + horas
 */
export function PerformanceTrendCard({ data }: { data: PerformanceData }) {
  const points = useMemo(
    () =>
      data.weekly
        .slice()
        .reverse()
        .slice(-26)
        .map((week) => ({
          week: week.isoWeekId,
          value: week.cumplimiento,
          rendimiento: week.rendimiento,
          actualHours: week.actualHoursRend,
          dotColor: complianceColor(week.cumplimiento),
        })),
    [data.weekly],
  );

  if (!points.length) {
    return (
      <ChartSurface
        title="Cumplimiento semanal"
        subtitle="Evolución de cumplimiento (rendimiento real / mínimo) en las últimas semanas"
      >
        <EmptyState label="Sin datos de rendimiento para el periodo." />
      </ChartSurface>
    );
  }

  return (
    <ChartSurface
      title="Cumplimiento semanal"
      subtitle="Evolución de cumplimiento (rendimiento real / mínimo) en las últimas semanas"
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
            <defs>
              <linearGradient id="cumplFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-chart-success-bold)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--color-chart-success-bold)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridConfig} />
            <XAxis
              dataKey="week"
              {...axisConfig}
              tick={axisTickStyleCompact}
              interval="preserveStartEnd"
              minTickGap={18}
            />
            <YAxis
              {...axisConfig}
              tick={axisTickStyle}
              domain={[0, "dataMax + 0.1"]}
              tickFormatter={(value: number) =>
                formatPercent(value, {
                  input: "ratio",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })
              }
            />
            <Tooltip
              cursor={tooltipCursorStyle}
              content={
                <RechartsTooltipAdapter
                  title={(label) => `Semana ${label}`}
                  mapPayload={(payload) => {
                    const row = payload[0]?.payload as
                      | { value?: number | null; rendimiento?: number | null; actualHours?: number | null }
                      | undefined;
                    return [
                      { label: "Cumplimiento", value: pct(row?.value ?? null) },
                      { label: "Rendimiento", value: pct(row?.rendimiento ?? null) },
                      { label: "Horas trab.", value: flex(row?.actualHours ?? null) },
                    ];
                  }}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-chart-success-bold)"
              strokeWidth={2}
              fill="url(#cumplFill)"
              dot={(props) => {
                const { cx, cy, payload, index } = props as {
                  cx: number;
                  cy: number;
                  index: number;
                  payload: { dotColor: string; value: number | null };
                };
                if (cx == null || cy == null || payload?.value == null) {
                  return <g key={`dot-empty-${index}`} />;
                }
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill="var(--color-card)"
                    stroke={payload.dotColor}
                    strokeWidth={2}
                  />
                );
              }}
              activeDot={(props) => {
                const { cx, cy, payload, index } = props as {
                  cx: number;
                  cy: number;
                  index: number;
                  payload: { dotColor: string };
                };
                if (cx == null || cy == null) return <g key={`adot-empty-${index}`} />;
                return (
                  <circle
                    key={`adot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={payload.dotColor}
                    stroke="var(--color-card)"
                    strokeWidth={2}
                  />
                );
              }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartSurface>
  );
}

// ─── Sección Rendimientos ────────────────────────────────────────────────────

type ActivityGroup = {
  name: string;
  unitOfMeasure: string;
  hoursOnly: boolean;
  actual: number;
  effective: number;
  units: number;
  rows: PerformanceData["detail"];
};

type WeeklyRollup = {
  week: PerformanceData["weekly"][number];
  hoursOnlyHours: number;
  rendHours: number;
  pctRend: number | null;
  pctHoursOnly: number | null;
  activities: ActivityGroup[];
};

function rollupWeekly(data: PerformanceData): WeeklyRollup[] {
  // Agrupa el detalle por (semana, actividad+unidad). Filtra filas con
  // `unitOfMeasure` vacío o "—" (no aportan información).
  const detailValid = data.detail.filter((row) => {
    const unit = row.unitOfMeasure?.trim();
    return Boolean(unit) && unit !== "-" && unit !== "—";
  });

  const byWeek = new Map<string, Map<string, ActivityGroup>>();

  for (const row of detailValid) {
    const weekMap = byWeek.get(row.isoWeekId) ?? new Map<string, ActivityGroup>();
    const unitOfMeasure = row.unitOfMeasure!.trim();
    const groupKey = `${row.activityName}::${unitOfMeasure.toLowerCase()}`;
    const existing = weekMap.get(groupKey);
    const item: ActivityGroup = existing ?? {
      name: row.activityName,
      unitOfMeasure,
      hoursOnly: isHoursOnlyUnit(unitOfMeasure),
      actual: 0,
      effective: 0,
      units: 0,
      rows: [],
    };
    item.actual += row.actualHours;
    item.effective += row.effectiveHours;
    item.units += row.unitsProduced;
    item.rows.push(row);
    weekMap.set(groupKey, item);
    byWeek.set(row.isoWeekId, weekMap);
  }

  return data.weekly.map((week) => {
    const activities = Array.from(byWeek.get(week.isoWeekId)?.values() ?? []).sort(
      (a, b) => b.actual - a.actual,
    );
    const hoursOnlyHours = activities
      .filter((act) => act.hoursOnly)
      .reduce((sum, act) => sum + act.actual, 0);
    const rendHours = activities
      .filter((act) => !act.hoursOnly)
      .reduce((sum, act) => sum + act.actual, 0);
    const denom = hoursOnlyHours + rendHours;
    return {
      week,
      hoursOnlyHours,
      rendHours,
      pctRend: denom > 0 ? rendHours / denom : null,
      pctHoursOnly: denom > 0 ? hoursOnlyHours / denom : null,
      activities,
    };
  });
}

export function PerformanceSection({ data }: { data: PerformanceData }) {
  const rollups = useMemo(() => rollupWeekly(data), [data]);
  const initialWeek = rollups[0]?.week.isoWeekId;
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(
    () => new Set(initialWeek ? [initialWeek] : []),
  );
  const [openActivities, setOpenActivities] = useState<Set<string>>(() => new Set());

  return (
    <div className="space-y-4">
      <KpiGrid className="grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        <MetricTile
          label="Horas presenciales"
          value={flex(data.totals.actualHoursHn + data.totals.actualHoursRend)}
          hint="suma total trabajada"
        />
        <MetricTile
          label="Horas con rendimiento"
          value={flex(data.totals.actualHoursRend)}
          hint="actividades dif. H normales"
        />
        <MetricTile label="Rendimiento" value={pct(data.totals.rendimiento)} hint="ponderado por horas" />
        <MetricTile
          label="Cumplimiento"
          value={pct(data.totals.cumplimiento)}
          hint="rendimiento / mínimo"
          accent={complianceAccent(data.totals.cumplimiento)}
        />
      </KpiGrid>

      <ChartSurface
        title="Detalle desplegable"
        subtitle="Por semana → actividad → fecha. Las actividades sin medida (—) se ocultan."
      >
        <ScrollFadeTable topScrollbar>
          <div className="min-w-[1080px]">
            <PerformanceTableHeader />
            <div role="rowgroup">
              {rollups.map((rollup) => {
                const weekKey = rollup.week.isoWeekId;
                const weekOpen = openWeeks.has(weekKey);
                return (
                  <div
                    key={weekKey}
                    className="border-b border-border/40 last:border-b-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSet(setOpenWeeks, weekKey)}
                      aria-expanded={weekOpen}
                      className="grid w-full grid-cols-[28px_minmax(220px,1.4fr)_repeat(5,minmax(110px,1fr))] items-center gap-3 px-4 py-3 text-left text-sm transition hover:bg-muted/45"
                    >
                      <ChevronCell open={weekOpen} />
                      <span className="font-semibold tracking-tight">
                        Semana {rollup.week.isoWeekId}
                      </span>
                      <NumCell value={flex(rollup.week.actualHoursHn + rollup.week.actualHoursRend)} />
                      <NumCell value={flex(rollup.week.actualHoursRend)} />
                      <NumCell
                        value={pct(rollup.week.rendimiento)}
                        className={cn(
                          "font-semibold",
                          toneClass(getComplianceTone(rollup.week.rendimiento)),
                        )}
                      />
                      <NumCell value={pct(rollup.pctRend)} />
                      <NumCell value={pct(rollup.pctHoursOnly)} />
                    </button>

                    {weekOpen
                      ? rollup.activities.map((activity) => {
                          const actKey = `${weekKey}::${activity.name}::${activity.unitOfMeasure}`;
                          const actOpen = openActivities.has(actKey);
                          const rendimiento = activity.hoursOnly
                            ? null
                            : ratioOrNull(activity.effective, activity.actual);
                          return (
                            <div key={actKey}>
                              <button
                                type="button"
                                onClick={() => toggleSet(setOpenActivities, actKey)}
                                aria-expanded={actOpen}
                                className="grid w-full grid-cols-[28px_minmax(220px,1.4fr)_repeat(5,minmax(110px,1fr))] items-center gap-3 border-t border-border/30 bg-muted/20 px-4 py-2 text-left text-xs transition hover:bg-muted/40"
                              >
                                <ChevronCell open={actOpen} indent />
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide",
                                      activity.hoursOnly
                                        ? "border border-[var(--color-chart-info)] bg-[color-mix(in_srgb,var(--color-chart-info)_18%,transparent)] text-[var(--color-chart-info-bold)]"
                                        : "border border-[var(--color-chart-success)] bg-[color-mix(in_srgb,var(--color-chart-success)_22%,transparent)] text-[var(--color-chart-success-bold)]",
                                    )}
                                  >
                                    {activity.hoursOnly ? "H Normales" : activity.unitOfMeasure}
                                  </span>
                                  <span className="truncate">{activity.name}</span>
                                </span>
                                <NumCell value={flex(activity.actual)} />
                                <NumCell value={activity.hoursOnly ? "—" : flex(activity.effective)} />
                                <NumCell
                                  value={activity.hoursOnly ? "—" : pct(rendimiento)}
                                  className={cn(
                                    !activity.hoursOnly && "font-semibold",
                                    !activity.hoursOnly && toneClass(getComplianceTone(rendimiento)),
                                  )}
                                />
                                <NumCell value="—" muted />
                                <NumCell value="—" muted />
                              </button>

                              {actOpen
                                ? activity.rows.map((row, index) => {
                                    const rowKey = `${actKey}::${row.eventDate}::${index}`;
                                    return (
                                      <div
                                        key={rowKey}
                                        className="grid grid-cols-[28px_minmax(220px,1.4fr)_repeat(5,minmax(110px,1fr))] items-center gap-3 border-t border-border/20 bg-background/40 px-4 py-2 text-xs text-muted-foreground"
                                      >
                                        <span aria-hidden="true" />
                                        <span className="pl-6">
                                          {dateVal(row.eventDate)}
                                          {row.unitsProduced > 0
                                            ? ` · ${flex(row.unitsProduced)} ${activity.unitOfMeasure}`
                                            : ""}
                                        </span>
                                        <NumCell value={flex(row.actualHours)} />
                                        <NumCell
                                          value={
                                            activity.hoursOnly ? "—" : flex(row.effectiveHours)
                                          }
                                        />
                                        <NumCell
                                          value={activity.hoursOnly ? "—" : pct(row.rendimiento)}
                                        />
                                        <NumCell value="—" muted />
                                        <NumCell value="—" muted />
                                      </div>
                                    );
                                  })
                                : null}
                            </div>
                          );
                        })
                      : null}
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollFadeTable>
      </ChartSurface>

      <PerformanceTrendCard data={data} />
    </div>
  );
}

function PerformanceTableHeader() {
  return (
    <div className="grid grid-cols-[28px_minmax(220px,1.4fr)_repeat(5,minmax(110px,1fr))] items-center gap-3 border-b border-border/60 bg-muted/55 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
      <span aria-hidden="true" />
      <span>Descripción</span>
      <span className="text-right">H. presenciales</span>
      <span className="text-right">H. con rend.</span>
      <span className="text-right">Rendimiento</span>
      <span className="text-right">% H Rend.</span>
      <span className="text-right">% H Normales</span>
    </div>
  );
}

function ChevronCell({ open, indent = false }: { open: boolean; indent?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-5 items-center justify-center text-muted-foreground",
        indent && "ml-3",
      )}
      aria-hidden="true"
    >
      {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
    </span>
  );
}

function NumCell({
  value,
  className,
  muted,
}: {
  value: string;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-right tabular-nums",
        muted && "text-muted-foreground/55",
        className,
      )}
    >
      {value}
    </span>
  );
}

// ─── Sección Ausentismo ──────────────────────────────────────────────────────

export function AbsenteeismSection({ data }: { data: AbsenteeismData }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { hours: number; rows: AbsenteeismData["rows"] }>();
    for (const row of data.rows) {
      const key = row.activityId ?? "Sin actividad";
      const item = map.get(key) ?? { hours: 0, rows: [] };
      item.hours += row.absenceHours;
      item.rows.push(row);
      map.set(key, item);
    }
    return Array.from(map.entries())
      .map(([activityId, item]) => ({ activityId, ...item }))
      .sort((a, b) => b.hours - a.hours);
  }, [data.rows]);
  const [selectedActivity, setSelectedActivity] = useState(grouped[0]?.activityId ?? null);
  const active = grouped.find((item) => item.activityId === selectedActivity) ?? grouped[0] ?? null;
  const totalHours = data.totalHours;

  return (
    <Card className="border-border/70 bg-card/84">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-4" aria-hidden="true" />
          Ausentismo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <KpiGrid className="grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
          <MetricTile
            label="% Ausentismo"
            value={pct(data.metrics?.pctAbsTotal)}
            hint="faltas, atrasos y permisos"
          />
          <MetricTile label="% H. Rendimiento" value={pct(data.metrics?.pctActualHoursRend)} />
          <MetricTile label="% H. Normales" value={pct(data.metrics?.pctActualHoursHn)} />
          <MetricTile label="Horas ausentes" value={flex(totalHours)} />
        </KpiGrid>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-3">
            {grouped.length === 0 ? (
              <EmptyState label="Sin registros de ausentismo." />
            ) : null}
            {grouped.map((item) => {
              const isActive = active?.activityId === item.activityId;
              const widthRatio = totalHours > 0 ? Math.min(100, (item.hours / totalHours) * 100) : 0;
              return (
                <button
                  key={item.activityId}
                  type="button"
                  onClick={() => setSelectedActivity(item.activityId)}
                  aria-pressed={isActive}
                  className={cn(
                    "w-full rounded-[18px] border p-3 text-left transition",
                    isActive
                      ? "border-[var(--color-chart-info-bold)] bg-[color-mix(in_srgb,var(--color-chart-info)_18%,transparent)]"
                      : "border-border/60 bg-background/70 hover:border-border",
                  )}
                >
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-semibold">{item.activityId}</span>
                    <span className="tabular-nums">{flex(item.hours)} h</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${widthRatio}%`,
                        background: "var(--color-chart-info-bold)",
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
          <ScrollFadeTable className="bg-background/70" innerClassName="rounded-[16px]">
            <table className="min-w-[420px] text-sm">
              <thead>
                <tr>
                  <th className="bg-background/95 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Fecha
                  </th>
                  <th className="bg-background/95 px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Horas
                  </th>
                </tr>
              </thead>
              <tbody>
                {(active?.rows ?? []).map((row, index) => (
                  <tr
                    key={`${row.eventDate}-${row.workDate}-${index}`}
                    className="border-t border-border/40"
                  >
                    <td className="px-4 py-3">{dateVal(row.workDate ?? row.eventDate)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {flex(row.absenceHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollFadeTable>
        </div>
      </CardContent>
    </Card>
  );
}

