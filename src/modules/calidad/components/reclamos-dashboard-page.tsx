"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  CreditCard,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  ClaimScopeFilter,
  QualityClaimDashboardBreakdownRow,
  QualityClaimDashboardData,
  QualityClaimEntityBreakdown,
  QualityClaimProblemFamilyBreakdown,
} from "@/lib/calidad-reclamos-dashboard";
import { cn } from "@/lib/utils";
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
import { FilterPanel, KpiGrid } from "@/shared/layout/filter-panel";
import { SectionPageShell } from "@/shared/layout/section-page-shell";
import {
  formatDate,
  formatDateTime,
  formatDecimal,
  formatInteger,
  formatPercent,
} from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

const MONTH_LABELS: Record<number, string> = {
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

type ScopeControlOption = {
  label: string;
  scope: ClaimScopeFilter;
  href: string;
  active: boolean;
};

function monthShort(value: string) {
  const [year, month] = value.split("-");
  const monthLabel = MONTH_LABELS[Number(month)] ?? month ?? value;
  return year ? `${monthLabel} ${year.slice(-2)}` : value;
}

function barWidth(pct: number) {
  return `${Math.max(0, Math.min(100, pct))}%`;
}

function breakdownAccent(key: string) {
  if (key === "credit-note" || key === "applied") return "success" as const;
  if (key === "not-applicable" || key === "registered") return "warning" as const;
  if (key === "rejected") return "danger" as const;
  return "info" as const;
}

function statusBadgeVariant(key: string) {
  if (key === "applied") return "success" as const;
  if (key === "rejected") return "danger" as const;
  if (key === "registered") return "warning" as const;
  if (key === "pending-approval" || key === "pending-application") return "info" as const;
  return "outline" as const;
}

function chartColorByKey(key: string) {
  if (key === "credit-note" || key === "applied") return "var(--color-chart-success-bold)";
  if (key === "not-applicable" || key === "registered") return "var(--color-chart-warning)";
  if (key === "rejected") return "var(--color-chart-danger)";
  return "var(--color-chart-info-bold)";
}

function drillthroughHrefForApplicability(key: string) {
  if (key === "credit-note" || key === "not-applicable") {
    return "/dashboard/comercial/reclamos?tab=registration";
  }
  return null;
}

function drillthroughHrefForStatus(key: string) {
  if (key === "pending-approval") return "/dashboard/comercial/reclamos?tab=approvals";
  if (key === "pending-application") return "/dashboard/comercial/reclamos?tab=applications";
  if (key === "applied" || key === "registered" || key === "rejected") {
    return "/dashboard/comercial/reclamos?tab=registration";
  }
  return null;
}

function scopeLabel(scope: ClaimScopeFilter) {
  if (scope === "quality") return "calidad";
  if (scope === "commercial") return "comercial";
  return "todos";
}

function DistributionList({
  title,
  description,
  rows,
  emptyLabel,
}: {
  title: string;
  description: string;
  rows: QualityClaimDashboardBreakdownRow[];
  emptyLabel: string;
}) {
  return (
    <Card className="rounded-[24px] border border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="space-y-2 rounded-[20px] border border-border/70 bg-background/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{row.label}</p>
                    <Badge variant={breakdownAccent(row.key)}>{formatPercent(row.pct)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatInteger(row.count)} reclamos - ${formatDecimal(row.totalUsd, 2)} - {formatInteger(row.totalBunches)} bunches
                  </p>
                </div>
                <p className="text-lg font-semibold tabular-nums">{formatInteger(row.count)}</p>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-slate-900" style={{ width: barWidth(row.pct) }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function EntityBreakdownSection({
  title,
  description,
  rows,
  emptyLabel,
}: {
  title: string;
  description: string;
  rows: QualityClaimEntityBreakdown[];
  emptyLabel: string;
}) {
  return (
    <Card className="rounded-[24px] border border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : (
          rows.map((row) => (
            <details key={row.key} className="group rounded-[22px] border border-border/70 bg-background/80">
              <summary className="list-none cursor-pointer p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                      <p className="font-semibold">{row.label}</p>
                      <Badge variant="outline">{formatPercent(row.pct)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatInteger(row.count)} reclamos - ${formatDecimal(row.totalUsd, 2)} - {formatInteger(row.totalBunches)} bunches
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">Notas: {formatInteger(row.creditNoteCount)}</Badge>
                    <Badge variant="warning">Alertas: {formatInteger(row.alertCount)}</Badge>
                    <Badge variant="info">Pendientes: {formatInteger(row.pendingCount)}</Badge>
                  </div>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-slate-900" style={{ width: barWidth(row.pct) }} />
                </div>
              </summary>
              <div className="border-t border-border/60 px-4 pb-4 pt-3">
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-[16px] border border-border/60 bg-card/70 px-3 py-3">
                    <p className="break-words text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Aplicados</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{formatInteger(row.appliedCount)}</p>
                  </div>
                  <div className="rounded-[16px] border border-border/60 bg-card/70 px-3 py-3">
                    <p className="break-words text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Pendientes</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{formatInteger(row.pendingCount)}</p>
                  </div>
                  <div className="rounded-[16px] border border-border/60 bg-card/70 px-3 py-3">
                    <p className="break-words text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Rechazados</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{formatInteger(row.rejectedCount)}</p>
                  </div>
                  <div className="rounded-[16px] border border-border/60 bg-card/70 px-3 py-3">
                    <p className="break-words text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Alertas</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{formatInteger(row.registeredCount)}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {row.families.map((family) => (
                    <div key={`${row.key}-${family.familyName}`} className="rounded-[18px] border border-border/60 bg-card/70 px-3 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{family.familyName}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatInteger(family.count)} reclamos - ${formatDecimal(family.totalUsd, 2)} - {formatInteger(family.totalBunches)} bunches
                          </p>
                        </div>
                        <Badge variant="secondary">{formatPercent(family.pctWithinEntity)}</Badge>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-slate-500" style={{ width: barWidth(family.pctWithinEntity) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FamilyBreakdownCard({ family }: { family: QualityClaimProblemFamilyBreakdown }) {
  return (
    <details className="group rounded-[22px] border border-border/70 bg-background/80">
      <summary className="list-none cursor-pointer p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
              <p className="font-semibold">{family.familyName}</p>
              <Badge variant="outline">{formatPercent(family.pct)}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatInteger(family.count)} reclamos - ${formatDecimal(family.totalUsd, 2)} - {formatInteger(family.totalBunches)} bunches
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="success">Notas: {formatInteger(family.creditNoteCount)}</Badge>
            <Badge variant="warning">Alertas: {formatInteger(family.alertCount)}</Badge>
          </div>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-slate-900" style={{ width: barWidth(family.pct) }} />
        </div>
      </summary>
      <div className="border-t border-border/60 px-4 pb-4 pt-1">
        <div className="space-y-2">
          {family.problems.map((problem) => (
            <div key={`${family.familyName}-${problem.problemName}`} className="rounded-[18px] border border-border/60 bg-card/70 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{problem.problemName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatInteger(problem.count)} reclamos dentro del tipo - ${formatDecimal(problem.totalUsd, 2)} - {formatInteger(problem.totalBunches)} bunches
                  </p>
                </div>
                <Badge variant="secondary">{formatPercent(problem.pctWithinFamily)}</Badge>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-slate-500" style={{ width: barWidth(problem.pctWithinFamily) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function MonthlyTrendChart({
  rows,
  scope,
}: {
  rows: QualityClaimDashboardData["monthlyTrend"];
  scope: ClaimScopeFilter;
}) {
  const chartRows = rows.map((row) => ({
    ...row,
    label: monthShort(row.month),
  }));

  return (
    <ChartSurface
      title="Evolucion mensual"
      subtitle={`Serie de reclamos de ${scopeLabel(scope)}, separando nota de credito frente a alerta.`}
      className="rounded-[24px] border border-border/70 shadow-sm"
    >
      {chartRows.length === 0 ? (
        <EmptyState label="No hay suficientes datos para construir la evolucion mensual." />
      ) : (
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartRows} margin={{ top: 8, right: 18, left: 0, bottom: 4 }}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                dataKey="label"
                {...axisConfig}
                tick={axisTickStyleCompact}
                interval="preserveStartEnd"
                minTickGap={14}
              />
              <YAxis
                yAxisId="count"
                {...axisConfig}
                tick={axisTickStyle}
                allowDecimals={false}
                tickFormatter={(value: number) => formatInteger(value)}
              />
              <YAxis
                yAxisId="usd"
                orientation="right"
                {...axisConfig}
                tick={axisTickStyle}
                tickFormatter={(value: number) => `$${formatInteger(value)}`}
              />
              <Tooltip
                cursor={tooltipCursorStyle}
                content={(
                  <RechartsTooltipAdapter
                    title={(label) => String(label)}
                    mapPayload={(payload) =>
                      payload.map((entry) => ({
                        label: String(entry.name ?? ""),
                        value:
                          entry.name === "Monto USD"
                            ? `$${formatDecimal(Number(entry.value ?? 0), 2)}`
                            : formatInteger(Number(entry.value ?? 0)),
                      }))
                    }
                  />
                )}
              />
              <Legend />
              <Bar
                yAxisId="count"
                dataKey="creditNoteCount"
                name="Notas de credito"
                stackId="claims"
                radius={[8, 8, 0, 0]}
                fill="var(--color-chart-success-bold)"
                maxBarSize={28}
              />
              <Bar
                yAxisId="count"
                dataKey="alertCount"
                name="Alertas"
                stackId="claims"
                radius={[8, 8, 0, 0]}
                fill="var(--color-chart-warning)"
                maxBarSize={28}
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="count"
                name="Total reclamos"
                stroke="var(--color-chart-info-bold)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-chart-info-bold)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="usd"
                type="monotone"
                dataKey="totalUsd"
                name="Monto USD"
                stroke="var(--color-chart-danger)"
                strokeDasharray="6 4"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartSurface>
  );
}

function BreakdownChart({
  title,
  subtitle,
  rows,
  hrefResolver,
}: {
  title: string;
  subtitle: string;
  rows: QualityClaimDashboardBreakdownRow[];
  hrefResolver?: (key: string) => string | null;
}) {
  const chartRows = rows.map((row) => ({
    ...row,
    fill: chartColorByKey(row.key),
    href: hrefResolver?.(row.key) ?? null,
  }));

  return (
    <ChartSurface title={title} subtitle={subtitle} className="rounded-[24px] border border-border/70 shadow-sm">
      {chartRows.length === 0 ? (
        <EmptyState label="No hay datos suficientes para graficar este corte." />
      ) : (
        <div className="h-[320px] w-full md:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} layout="vertical" margin={{ top: 4, right: 18, left: 18, bottom: 4 }}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                type="number"
                {...axisConfig}
                tick={axisTickStyle}
                allowDecimals={false}
                tickFormatter={(value: number) => formatInteger(value)}
              />
              <YAxis
                type="category"
                dataKey="label"
                {...axisConfig}
                tick={axisTickStyleCompact}
                width={140}
                interval={0}
              />
              <Tooltip
                cursor={tooltipCursorStyle}
                content={(
                  <RechartsTooltipAdapter
                    title={(label) => String(label)}
                    mapPayload={(payload) => {
                      const source = payload[0]?.payload as QualityClaimDashboardBreakdownRow | undefined;
                      if (!source) return [];
                      return [
                        { label: "Reclamos", value: formatInteger(source.count) },
                        { label: "Participacion", value: formatPercent(source.pct) },
                        { label: "Monto USD", value: `$${formatDecimal(source.totalUsd, 2)}` },
                        { label: "Bunches", value: formatInteger(source.totalBunches) },
                      ];
                    }}
                  />
                )}
              />
              <Bar
                dataKey="count"
                name="Reclamos"
                radius={[0, 10, 10, 0]}
                barSize={24}
                fill="var(--color-chart-info-bold)"
                onClick={hrefResolver ? (payload) => {
                  const destination = (payload as { href?: string | null } | undefined)?.href;
                  if (destination && typeof window !== "undefined") {
                    window.location.href = destination;
                  }
                } : undefined}
                className={hrefResolver ? "cursor-pointer" : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartSurface>
  );
}

function FamilyConcentrationChart({
  rows,
}: {
  rows: QualityClaimProblemFamilyBreakdown[];
}) {
  const chartRows = rows.slice(0, 8).map((row) => ({
    familyName: row.familyName,
    count: row.count,
    totalUsd: row.totalUsd,
    creditNoteCount: row.creditNoteCount,
    alertCount: row.alertCount,
  }));

  return (
    <ChartSurface
      title="Concentracion por tipo de problema"
      subtitle="Los tipos de problema que mas presionan el monto y el volumen de reclamos."
      className="rounded-[24px] border border-border/70 shadow-sm"
    >
      {chartRows.length === 0 ? (
        <EmptyState label="No hay tipos de problema suficientes para graficar." />
      ) : (
        <div className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartRows} margin={{ top: 8, right: 18, left: 0, bottom: 54 }}>
              <CartesianGrid {...gridConfig} />
              <XAxis
                dataKey="familyName"
                {...axisConfig}
                tick={axisTickStyleCompact}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={68}
              />
              <YAxis
                yAxisId="count"
                {...axisConfig}
                tick={axisTickStyle}
                allowDecimals={false}
                tickFormatter={(value: number) => formatInteger(value)}
              />
              <YAxis
                yAxisId="usd"
                orientation="right"
                {...axisConfig}
                tick={axisTickStyle}
                tickFormatter={(value: number) => `$${formatInteger(value)}`}
              />
              <Tooltip
                cursor={tooltipCursorStyle}
                content={(
                  <RechartsTooltipAdapter
                    title={(label) => String(label)}
                    mapPayload={(payload) => {
                      const source = payload[0]?.payload as (typeof chartRows)[number] | undefined;
                      if (!source) return [];
                      return [
                        { label: "Reclamos", value: formatInteger(source.count) },
                        { label: "Monto USD", value: `$${formatDecimal(source.totalUsd, 2)}` },
                        { label: "Notas", value: formatInteger(source.creditNoteCount) },
                        { label: "Alertas", value: formatInteger(source.alertCount) },
                      ];
                    }}
                  />
                )}
              />
              <Legend />
              <Bar
                yAxisId="count"
                dataKey="count"
                name="Reclamos"
                fill="var(--color-chart-info-bold)"
                radius={[10, 10, 0, 0]}
                maxBarSize={46}
              />
              <Line
                yAxisId="usd"
                type="monotone"
                dataKey="totalUsd"
                name="Monto USD"
                stroke="var(--color-chart-danger)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--color-chart-danger)" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartSurface>
  );
}

export function ReclamosDashboardPage({
  initialData,
  initialError,
  eyebrow = "Analitica / Calidad / Reclamos",
  title = "Reclamos",
  subtitle = "Lectura integral de los reclamos, separando notas de credito frente a alertas y priorizando la desagregacion por tipo de problema y problema especifico.",
  scopeControls,
}: {
  initialData: QualityClaimDashboardData;
  initialError?: string | null;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  scopeControls?: ScopeControlOption[];
}) {
  const isAllScopes = initialData.appliedScope === "all";

  return (
    <div className="space-y-4">
      <SectionPageShell
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        icon={<Activity className="size-5" aria-hidden="true" />}
      >
        <></>
      </SectionPageShell>

      <FilterPanel>
        {scopeControls?.length ? (
          <Card className="rounded-[24px] border border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Alcance de analisis</CardTitle>
              <CardDescription>
                Cambia entre el universo completo o uno de los dos frentes sin salir del mismo dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {scopeControls.map((option) => (
                  <Link
                    key={option.scope}
                    href={option.href}
                    className={cn(
                      "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition",
                      option.active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-border bg-background text-foreground hover:bg-muted/60",
                    )}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <KpiGrid columns={5}>
          <MetricTile
            label={`Total reclamos ${scopeLabel(initialData.appliedScope)}`}
            value={formatInteger(initialData.summary.totalClaims)}
            hint="Total historico del alcance actualmente seleccionado."
          />
          <MetricTile
            label="Con nota de credito"
            value={formatInteger(initialData.summary.creditNoteClaims)}
            hint="Casos que siguen el circuito de aprobacion y aplicacion."
            accent="success"
          />
          <MetricTile
            label="Alertas / sin nota"
            value={formatInteger(initialData.summary.alertClaims)}
            hint="Incidencias operativas que no generan nota de credito."
            accent="warning"
          />
          <MetricTile
            label="Pendientes"
            value={formatInteger(initialData.summary.pendingClaims)}
            hint="Suma de pendientes de aprobacion y pendientes de aplicacion."
            accent="danger"
          />
          <MetricTile
            label="Aplicados"
            value={formatInteger(initialData.summary.appliedClaims)}
            hint="Reclamos ya cerrados en el flujo operativo."
            accent="success"
          />
        </KpiGrid>

        <KpiGrid columns={4}>
          <MetricTile
            label="Monto reclamado"
            value={`$${formatDecimal(initialData.summary.totalClaimedUsd, 2)}`}
            hint="Solo suma valor donde el reclamo trae monto economico."
          />
          <MetricTile
            label="Bunches reclamados"
            value={formatInteger(initialData.summary.totalClaimedBunches)}
            hint="Total de bunches reportados en la base historica."
          />
          <MetricTile
            label="Pendientes aprobacion"
            value={formatInteger(initialData.summary.pendingApprovalClaims)}
            hint="Reclamos aun esperando decision de aprobacion."
          />
          <MetricTile
            label="Pendientes aplicacion"
            value={formatInteger(initialData.summary.pendingApplicationClaims)}
            hint="Reclamos ya aprobados que aun no se aplican."
          />
        </KpiGrid>

        {initialError ? (
          <div className="rounded-[24px] border border-slate-300/60 bg-slate-500/10 px-4 py-3 text-sm text-slate-950">
            {initialError}
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
          <MonthlyTrendChart rows={initialData.monthlyTrend} scope={initialData.appliedScope} />
          <Card className="rounded-[24px] border border-border/70 shadow-sm">
            <CardHeader>
              <CardTitle>Lectura ejecutiva</CardTitle>
              <CardDescription>
                Resumen rapido del flujo de reclamos y su madurez operativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CreditCard className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-[0.16em]">Notas de credito</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {formatPercent(
                    initialData.summary.totalClaims > 0
                      ? (initialData.summary.creditNoteClaims / initialData.summary.totalClaims) * 100
                      : 0,
                    { input: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0, empty: "0 %" },
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Participacion sobre el total de reclamos del alcance actual.
                </p>
              </div>
              <div className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldAlert className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-[0.16em]">Alertas</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {formatPercent(
                    initialData.summary.totalClaims > 0
                      ? (initialData.summary.alertClaims / initialData.summary.totalClaims) * 100
                      : 0,
                    { input: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0, empty: "0 %" },
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Casos sin nota que igualmente exigen lectura correctiva.
                </p>
              </div>
              <div className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-[0.16em]">USD promedio</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  ${formatDecimal(
                    initialData.summary.totalClaims > 0
                      ? initialData.summary.totalClaimedUsd / initialData.summary.totalClaims
                      : 0,
                    2,
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Monto economico medio por reclamo.
                </p>
              </div>
              <div className="rounded-[20px] border border-border/70 bg-background/80 p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertTriangle className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-[0.16em]">Pendiente real</span>
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {formatPercent(
                    initialData.summary.totalClaims > 0
                      ? (initialData.summary.pendingClaims / initialData.summary.totalClaims) * 100
                      : 0,
                    { input: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0, empty: "0 %" },
                  )}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Peso relativo de reclamos todavia no cerrados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <BreakdownChart
            title="Naturaleza del reclamo"
            subtitle="Separa visualmente notas de credito frente a alertas o reclamos sin nota."
            rows={initialData.applicabilityBreakdown}
            hrefResolver={drillthroughHrefForApplicability}
          />
          <BreakdownChart
            title="Estado del proceso"
            subtitle="Muestra en que parte del flujo se esta deteniendo el reclamo."
            rows={initialData.statusBreakdown}
            hrefResolver={drillthroughHrefForStatus}
          />
        </div>

        <FamilyConcentrationChart rows={initialData.familyBreakdown} />

        <Card className="rounded-[24px] border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Tipo de problema y desagregacion</CardTitle>
            <CardDescription>
              Primero se lee el tipo de problema y solo al abrirlo baja al problema especifico que lo compone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {initialData.familyBreakdown.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">
                No hay tipos de problema cargados para este alcance.
              </div>
            ) : (
              initialData.familyBreakdown.map((family) => (
                <FamilyBreakdownCard key={family.familyName} family={family} />
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-3">
          <EntityBreakdownSection
            title="Clientes mas afectados"
            description="Clientes con mayor numero de reclamos, con apertura al detalle de su mezcla de problemas y situacion operativa."
            rows={initialData.topCustomers}
            emptyLabel="No hay clientes para mostrar."
          />
          <EntityBreakdownSection
            title="Comercializadoras mas impactadas"
            description="Comercializadoras mas impactadas, con desglose interno por tipo de problema."
            rows={initialData.topCommercializers}
            emptyLabel="No hay comercializadoras para mostrar."
          />
          <DistributionList
            title="Ejecutivos mas expuestos"
            description="Lectura de donde se concentra la gestion comercial del reclamo."
            rows={initialData.topExecutives}
            emptyLabel="No hay ejecutivos para mostrar."
          />
        </div>

        <Card className="rounded-[24px] border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>Notas de lectura</CardTitle>
            <CardDescription>
              Consideraciones para interpretar correctamente el dashboard de reclamos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialData.notes.map((note) => (
              <div key={note} className="rounded-[20px] border border-border/70 bg-background/80 p-4 text-sm text-muted-foreground">
                {note}
              </div>
            ))}
          </CardContent>
        </Card>
      </FilterPanel>
    </div>
  );
}
