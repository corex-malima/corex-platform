"use client";

import { cn } from "@/lib/utils";
import type { TalentoExitRecord } from "@/lib/talento-humano";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState } from "@/shared/data-display/empty-state";
import { formatInteger, formatPercent } from "@/shared/lib/format";

export type ExitGroup = {
  label: string;
  count: number;
  rows: TalentoExitRecord[];
  avgCompliance: number | null;
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
          {groups.map((group) => {
            const ratio = total ? group.count / total : 0;
            const tone = getComplianceTone(group.avgCompliance);
            return (
              <button
                key={group.label}
                type="button"
                className="grid w-full grid-cols-[minmax(100px,0.85fr)_minmax(140px,1.25fr)_auto] items-center gap-3 rounded-[14px] px-2 py-1.5 text-left text-xs transition hover:bg-muted/55"
                onClick={() => onSelect(group)}
              >
                <span className="min-w-0 truncate font-medium">{group.label}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-[var(--chart-line-primary)]" style={{ width: `${Math.max(2, ratio * 100)}%` }} />
                </span>
                <span className="shrink-0 text-right font-semibold tabular-nums">
                  {formatPercent(ratio, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })} ({formatInteger(group.count)})
                  {showCompliance ? (
                    <span className={cn("ml-2", toneClass(tone))}>
                      {formatPercent(group.avgCompliance, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                  ) : null}
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

export function CategoryChipCloud({
  title,
  groups,
  onSelect,
}: {
  title: string;
  groups: ExitGroup[];
  onSelect: (group: ExitGroup) => void;
}) {
  const total = groups.reduce((sum, group) => sum + group.count, 0);

  return (
    <ChartSurface title={title} subtitle="Vista compacta para detectar temas recurrentes sin repetir barras.">
      {groups.length ? (
        <div className="flex flex-wrap gap-3">
          {groups.map((group) => {
            const ratio = total ? group.count / total : 0;
            return (
              <button
                key={group.label}
                type="button"
                onClick={() => onSelect(group)}
                className="group min-w-[180px] flex-1 rounded-[20px] border border-border/70 bg-background/70 px-4 py-3 text-left transition hover:border-primary/30 hover:bg-muted/45"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground group-hover:text-primary">{group.label}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{formatInteger(group.count)}</span>
                </div>
                <div className="mt-3 text-xs text-muted-foreground">
                  {formatPercent(ratio, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })} del total visible
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState label="Sin categorias para los filtros seleccionados." />
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
  const topGroups = groups.slice(0, 5);
  const segments = topGroups.reduce<Array<{ start: number; end: number; group: ExitGroup }>>((acc, group) => {
    const start = acc.length ? acc[acc.length - 1].end : 0;
    const end = start + (total ? (group.count / total) * 100 : 0);
    return [...acc, { start, end, group }];
  }, []);
  const gradient = segments.length
    ? segments.map((segment, index) => {
      const color = index % 2 === 0 ? "var(--chart-line-primary)" : "var(--muted-foreground)";
      return `${color} ${segment.start}% ${segment.end}%`;
    }).join(", ")
    : "var(--muted) 0 100%";
  const main = topGroups[0] ?? null;

  return (
    <ChartSurface title={title} subtitle="Composicion por categoria, conservando tambien los registros sin dato.">
      {groups.length ? (
        <div className="grid gap-5 md:grid-cols-[190px_1fr]">
          <button
            type="button"
            className="mx-auto grid size-40 place-items-center rounded-full border border-border/70 shadow-inner"
            style={{ background: `conic-gradient(${gradient})` }}
            onClick={() => main && onSelect(main)}
          >
            <span className="grid size-24 place-items-center rounded-full bg-card text-center text-xs font-semibold shadow-sm">
              {formatInteger(total)}
              <span className="block text-[10px] font-normal text-muted-foreground">salidas</span>
            </span>
          </button>
          <div className="grid gap-2">
            {topGroups.map((group, index) => {
              const ratio = total ? group.count / total : 0;
              return (
                <button
                  key={group.label}
                  type="button"
                  onClick={() => onSelect(group)}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[14px] border border-border/60 bg-background/70 px-3 py-2 text-left transition hover:border-primary/35 hover:bg-muted/45"
                >
                  <span className={cn("size-2.5 rounded-full", index % 2 === 0 ? "bg-[var(--chart-line-primary)]" : "bg-muted-foreground")} />
                  <span className="min-w-0 truncate text-sm font-medium">{group.label}</span>
                  <span className="text-xs font-semibold tabular-nums">{formatPercent(ratio, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyState label="Sin categorias para los filtros seleccionados." />
      )}
    </ChartSurface>
  );
}

export function ComplianceMatrixCard({
  groups,
  onSelect,
}: {
  groups: ExitGroup[];
  onSelect: (group: ExitGroup) => void;
}) {
  return (
    <ChartSurface title="Antigüedad vs cumplimiento" subtitle="Lectura rápida de experiencia acumulada y desempeño antes de la salida.">
      {groups.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const tone = getComplianceTone(group.avgCompliance);
            return (
              <button
                key={group.label}
                type="button"
                onClick={() => onSelect(group)}
                className="rounded-[18px] border border-border/70 bg-background/70 p-4 text-left transition hover:border-primary/35 hover:bg-muted/40"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{group.label}</div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <div className={cn("text-2xl font-semibold tabular-nums", toneClass(tone))}>
                      {formatPercent(group.avgCompliance, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground">cumplimiento promedio</div>
                  </div>
                  <div className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">{formatInteger(group.count)} salidas</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState label="Sin datos para cruzar antigüedad y cumplimiento." />
      )}
    </ChartSurface>
  );
}
