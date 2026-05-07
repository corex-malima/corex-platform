"use client";

import { useMemo, useState } from "react";
import type React from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { StandardTable, StandardTd, StandardTh } from "@/shared/tables/standard-table";
import {
  getComplianceTone,
  toneClass,
} from "@/modules/talento-humano/components/desvinculacion-charts";
import { Activity } from "lucide-react";

type PerformanceData = NonNullable<CollaboratorDetailPayload["performance"]>;
type AbsenteeismData = NonNullable<CollaboratorDetailPayload["absenteeism"]>;

function pct(value: number | null | undefined) {
  return value == null
    ? "-"
    : formatPercent(value, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function dateVal(value: string | null | undefined) {
  return value ? formatDate(value) : "-";
}

function ratio(numerator: number, denominator: number) {
  return denominator > 0 ? numerator / denominator : null;
}

function toggleSet(setter: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}

/**
 * Tono canónico para cumplimiento (rendimiento / mínimo) en base a thresholds:
 * `>= 1.0` → success-bold, `>= 0.9` → warning, `< 0.9` → danger.
 */
function complianceColor(value: number | null | undefined) {
  if (value == null) return "var(--color-chart-neutral)";
  if (value >= 1) return "var(--color-chart-success-bold)";
  if (value >= 0.9) return "var(--color-chart-warning)";
  return "var(--color-chart-danger)";
}

/**
 * Gauge canónico de cumplimiento. Mantiene la visual conic-gradient pero
 * envuelve en `ChartSurface` y usa tokens de chart en lugar de `--primary`.
 */
export function GaugeCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | null | undefined;
  hint: string;
}) {
  const normalized = Math.max(0, Math.min(1.25, value ?? 0));
  const degrees = (normalized / 1.25) * 360;
  const color = complianceColor(value);

  return (
    <ChartSurface title={label} subtitle={hint}>
      <div className="flex items-center gap-4">
        <div
          className="grid size-20 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${degrees}deg, color-mix(in srgb, var(--color-muted-foreground) 18%, transparent) 0deg)`,
          }}
        >
          <div className="grid size-14 place-items-center rounded-full bg-card text-sm font-semibold tabular-nums">
            {pct(value)}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Compara el rendimiento real contra el mínimo. Sobre 100% indica desempeño bajo meta exigente.
        </p>
      </div>
    </ChartSurface>
  );
}

/**
 * Gráfico canónico semanal de cumplimiento. Reemplaza el patrón con `<div>` bars
 * por Recharts + RechartsTooltipAdapter + tokens chart.
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
          value: week.cumplimiento ?? 0,
          rendimiento: week.rendimiento,
          actualHours: week.actualHoursRend,
          fill: complianceColor(week.cumplimiento),
        })),
    [data.weekly],
  );

  if (!points.length) {
    return (
      <ChartSurface title="Cumplimiento semanal" subtitle="Rendimiento / mínimo, últimas 26 semanas">
        <EmptyState label="Sin datos de rendimiento para el periodo." />
      </ChartSurface>
    );
  }

  return (
    <ChartSurface title="Cumplimiento semanal" subtitle="Rendimiento / mínimo, últimas 26 semanas">
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid {...gridConfig} />
            <XAxis dataKey="week" {...axisConfig} tick={axisTickStyleCompact} interval="preserveStartEnd" />
            <YAxis
              {...axisConfig}
              tick={axisTickStyle}
              tickFormatter={(value: number) =>
                formatPercent(value, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })
              }
            />
            <Tooltip
              cursor={tooltipCursorStyle}
              content={
                <RechartsTooltipAdapter
                  title={(label) => `Semana ${label}`}
                  mapPayload={(payload) => {
                    const row = payload[0]?.payload as
                      | { value?: number; rendimiento?: number | null; actualHours?: number | null }
                      | undefined;
                    return [
                      { label: "Cumplimiento", value: pct(row?.value) },
                      { label: "Rendimiento", value: pct(row?.rendimiento ?? null) },
                      { label: "Horas trab.", value: formatFlexibleNumber(row?.actualHours ?? null) },
                    ];
                  }}
                />
              }
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {points.map((point) => (
                <Cell key={point.week} fill={point.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartSurface>
  );
}

/**
 * Tarjeta de resumen de ausentismo, ahora envuelta en `ChartSurface` con
 * progress bar usando token chart-info-bold y sub-chips con `toneClass` canon.
 */
export function AbsenceSummaryCard({ absenteeism }: { absenteeism: AbsenteeismData }) {
  const absencePct = absenteeism.metrics?.pctAbsTotal ?? null;
  const tone = absenceTone(absencePct);

  return (
    <ChartSurface title="% Ausentismo" subtitle="Solo faltas, atrasos y permisos">
      <div className="space-y-3">
        <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{pct(absencePct)}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <MetricChip label="% Rend." value={pct(absenteeism.metrics?.pctActualHoursRend)} />
          <MetricChip label="% HN" value={pct(absenteeism.metrics?.pctActualHoursHn)} />
        </div>
      </div>
    </ChartSurface>
  );
}

function absenceTone(value: number | null | undefined) {
  if (value == null) return "text-muted-foreground";
  if (value <= 0.05) return "text-[var(--color-chart-success-bold)]";
  if (value <= 0.1) return "text-[var(--color-chart-warning)]";
  return "text-[var(--color-chart-danger)]";
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-border/50 bg-card/70 px-2 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function PerformanceSection({ data }: { data: PerformanceData }) {
  const initialWeek = data.weekly[0]?.isoWeekId;
  const [openWeeks, setOpenWeeks] = useState<Set<string>>(() => new Set(initialWeek ? [initialWeek] : []));
  const [openActivities, setOpenActivities] = useState<Set<string>>(() => new Set());
  const activitiesByWeek = useMemo(() => {
    const byWeek = new Map<
      string,
      Array<{ name: string; actual: number; effective: number; dates: PerformanceData["detail"] }>
    >();
    for (const row of data.detail) {
      const list = byWeek.get(row.isoWeekId) ?? [];
      const existing = list.find((item) => item.name === row.activityName);
      const item = existing ?? { name: row.activityName, actual: 0, effective: 0, dates: [] };
      item.actual += row.actualHours;
      item.effective += row.effectiveHours;
      item.dates.push(row);
      if (!existing) list.push(item);
      byWeek.set(row.isoWeekId, list);
    }
    return byWeek;
  }, [data.detail]);

  return (
    <div className="space-y-4">
      <KpiGrid className="grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        <MetricTile label="Horas presenciales" value={formatFlexibleNumber(data.totals.actualHoursHn)} />
        <MetricTile label="Horas trabajadas" value={formatFlexibleNumber(data.totals.actualHoursRend)} />
        <MetricTile label="Rendimiento" value={pct(data.totals.rendimiento)} />
        <MetricTile
          label="Cumplimiento"
          value={pct(data.totals.cumplimiento)}
          accent={
            data.totals.cumplimiento != null && data.totals.cumplimiento >= 1
              ? "success"
              : data.totals.cumplimiento != null && data.totals.cumplimiento >= 0.9
                ? "warning"
                : data.totals.cumplimiento != null
                  ? "danger"
                  : "default"
          }
        />
      </KpiGrid>
      <PerformanceTrendCard data={data} />
      <ChartSurface title="Rendimiento desplegable" subtitle="Por semana, actividad y fecha">
        <ScrollFadeTable topScrollbar>
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[32px_1fr_repeat(3,minmax(130px,150px))] items-center gap-3 border-b border-border/60 bg-muted/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <span aria-hidden="true" />
              <span>Descripción</span>
              <span>H. presenciales</span>
              <span>H. trabajadas</span>
              <span>Rendimiento</span>
            </div>
            {data.weekly.map((week) => (
              <div key={week.isoWeekId} className="border-b border-border/40 last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleSet(setOpenWeeks, week.isoWeekId)}
                  aria-expanded={openWeeks.has(week.isoWeekId)}
                  className="grid w-full grid-cols-[32px_1fr_repeat(3,minmax(130px,150px))] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-muted/35"
                >
                  <span className="text-muted-foreground" aria-hidden="true">
                    {openWeeks.has(week.isoWeekId) ? "⌄" : "›"}
                  </span>
                  <span className="font-semibold">Semana {week.isoWeekId}</span>
                  <span className="tabular-nums">{formatFlexibleNumber(week.actualHoursHn)}</span>
                  <span className="tabular-nums">{formatFlexibleNumber(week.actualHoursRend)}</span>
                  <span className={cn("font-semibold tabular-nums", toneClass(getComplianceTone(week.rendimiento)))}>
                    {pct(week.rendimiento)}
                  </span>
                </button>
                {openWeeks.has(week.isoWeekId)
                  ? (activitiesByWeek.get(week.isoWeekId) ?? []).map((activity) => {
                    const key = `${week.isoWeekId}::${activity.name}`;
                    return (
                      <div key={key}>
                        <button
                          type="button"
                          onClick={() => toggleSet(setOpenActivities, key)}
                          aria-expanded={openActivities.has(key)}
                          className="grid w-full grid-cols-[56px_1fr_repeat(3,minmax(130px,150px))] items-center gap-3 border-t border-border/30 bg-muted/18 px-4 py-2 text-left text-xs"
                        >
                          <span className="pl-6 text-muted-foreground" aria-hidden="true">
                            {openActivities.has(key) ? "⌄" : "›"}
                          </span>
                          <span>{activity.name}</span>
                          <span className="tabular-nums">{formatFlexibleNumber(activity.actual)}</span>
                          <span className="tabular-nums">{formatFlexibleNumber(activity.effective)}</span>
                          <span className="font-semibold tabular-nums">
                            {pct(ratio(activity.effective, activity.actual))}
                          </span>
                        </button>
                        {openActivities.has(key)
                          ? activity.dates.map((row, index) => (
                            <div
                              key={`${key}-${row.eventDate}-${index}`}
                              className="grid grid-cols-[84px_1fr_repeat(3,minmax(130px,150px))] items-center gap-3 border-t border-border/20 px-4 py-2 text-xs text-muted-foreground"
                            >
                              <span aria-hidden="true" />
                              <span>
                                {dateVal(row.eventDate)} · {row.unitOfMeasure ?? "-"}
                              </span>
                              <span className="tabular-nums">{formatFlexibleNumber(row.actualHours)}</span>
                              <span className="tabular-nums">{formatFlexibleNumber(row.effectiveHours)}</span>
                              <span className="tabular-nums">{pct(row.rendimiento)}</span>
                            </div>
                          ))
                          : null}
                      </div>
                    );
                  })
                  : null}
              </div>
            ))}
          </div>
        </ScrollFadeTable>
      </ChartSurface>
    </div>
  );
}

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
          <MetricTile label="% H. rendimiento" value={pct(data.metrics?.pctActualHoursRend)} />
          <MetricTile label="% HN" value={pct(data.metrics?.pctActualHoursHn)} />
          <MetricTile label="Horas ausentes" value={formatFlexibleNumber(totalHours)} />
        </KpiGrid>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-3">
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
                    <span className="tabular-nums">{formatFlexibleNumber(item.hours)} h</span>
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
            <StandardTable className="min-w-[420px]">
              <thead>
                <tr>
                  <StandardTh>Fecha</StandardTh>
                  <StandardTh align="right">Horas</StandardTh>
                </tr>
              </thead>
              <tbody>
                {(active?.rows ?? []).map((row, index) => (
                  <tr
                    key={`${row.eventDate}-${row.workDate}-${index}`}
                    className="border-t border-border/40"
                  >
                    <StandardTd>{dateVal(row.workDate ?? row.eventDate)}</StandardTd>
                    <StandardTd align="right" className="font-semibold">
                      {formatFlexibleNumber(row.absenceHours)}
                    </StandardTd>
                  </tr>
                ))}
              </tbody>
            </StandardTable>
          </ScrollFadeTable>
        </div>
      </CardContent>
    </Card>
  );
}
