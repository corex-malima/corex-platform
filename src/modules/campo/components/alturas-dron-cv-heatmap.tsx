"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";
import { EmptyState } from "@/shared/data-display/empty-state";
import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { axisConfig, axisTickStyle, gridConfig } from "@/shared/charts";
import { formatDecimal, formatPercent } from "@/shared/lib/format";

// ─── Zona helpers ─────────────────────────────────────────────────────────────
type Zona = "buena" | "alerta" | "problema";

function getZona(cv: number | null, gini: number | null): Zona {
  if (cv === null || gini === null) return "alerta";
  if (cv < 0.25 && gini < 0.3) return "buena";
  if (cv >= 0.4 && gini >= 0.5) return "problema";
  return "alerta";
}

function zonaLabel(zona: Zona): string {
  if (zona === "buena") return "BUENO";
  if (zona === "alerta") return "ALERTA";
  return "PROBLEMA";
}

function zonaColor(zona: Zona): string {
  if (zona === "buena") return "var(--color-chart-success-bold)";
  if (zona === "alerta") return "var(--color-chart-warning)";
  return "var(--color-chart-danger)";
}

function fmtPct(val: number | null): string {
  return formatPercent(val, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

// ─── Tooltip custom ───────────────────────────────────────────────────────────
type ScatterPoint = {
  cx: number | null;
  cy: number | null;
  cz: number | null;
  cycleKey: string;
  variety: string | null;
  zona: Zona;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ScatterPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  if (!d) return null;
  const zona = d.zona;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-[var(--shadow-tooltip)]">
      <p className="mb-1 font-mono font-semibold text-foreground">{d.cycleKey}</p>
      {d.variety && (
        <p className="mb-1 text-muted-foreground">Variedad: {d.variety}</p>
      )}
      <p className="tabular-nums text-foreground">
        CV = {fmtPct(d.cx)}
      </p>
      <p className="tabular-nums text-foreground">
        Gini = {d.cy !== null ? formatDecimal(d.cy) : "—"}
      </p>
      <p
        className="mt-1 font-semibold"
        style={{ color: zonaColor(zona) }}
      >
        {zona === "buena" && "✓ BUENO"}
        {zona === "alerta" && "⚠ ALERTA"}
        {zona === "problema" && "✗ PROBLEMA"}
      </p>
    </div>
  );
}

// ─── Recommendation helper ────────────────────────────────────────────────────
function buildRecommendation(cv: number | null, gini: number | null): string {
  if (cv !== null && cv >= 0.4 && gini !== null && gini >= 0.5) {
    return "CV alto y distribución muy desigual — revisar riego y densidad";
  }
  if (cv !== null && cv >= 0.4) {
    return "CV alto — revisar uniformidad de riego o sustratos";
  }
  if (gini !== null && gini >= 0.5) {
    return "Alta desigualdad interna — identificar zonas con plantas rezagadas";
  }
  return "Monitorear evolución en siguiente medición";
}

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  stats: AlturasDronStatsRow[];
  onCellClick?: (cycleKey: string, eventDate: string) => void;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export function AlturasDronCvHeatmap({ stats, onCellClick }: Props) {
  // For each cycleKey pick the most recent row
  const cyclePoints = useMemo<ScatterPoint[]>(() => {
    const map = new Map<string, AlturasDronStatsRow>();
    for (const row of stats) {
      const existing = map.get(row.cycleKey);
      if (!existing || row.eventDate > existing.eventDate) {
        map.set(row.cycleKey, row);
      }
    }
    return [...map.values()].map((row) => ({
      cx: row.cv ?? null,
      cy: row.gini ?? null,
      // Z proportional to mean height — scale so bubble size is readable
      cz: row.mean > 0 ? Math.max(20, Math.min(300, row.mean * 120)) : 60,
      cycleKey: row.cycleKey,
      variety: row.variety,
      zona: getZona(row.cv, row.gini),
      // Expose for onClick lookup
      _eventDate: row.eventDate,
    })) as unknown as ScatterPoint[];
  }, [stats]);

  // Partition for table
  const problemCycles = useMemo(() => {
    const map = new Map<string, AlturasDronStatsRow>();
    for (const row of stats) {
      const existing = map.get(row.cycleKey);
      if (!existing || row.eventDate > existing.eventDate) {
        map.set(row.cycleKey, row);
      }
    }
    return [...map.values()].filter((r) => getZona(r.cv, r.gini) === "problema");
  }, [stats]);

  if (stats.length === 0) {
    return (
      <ChartSection>
        <ChartSurface title="Heterogeneidad por ciclo — mapa de posicionamiento">
          <EmptyState label="Sin datos para construir el mapa de heterogeneidad." />
        </ChartSurface>
      </ChartSection>
    );
  }

  // Filter to points with both axes valid for the scatter
  const validPoints = cyclePoints.filter((p) => p.cx !== null && p.cy !== null);

  const handleClick = onCellClick
    ? (point: unknown) => {
        const p = point as ScatterPoint & { _eventDate?: string };
        if (p?.cycleKey) {
          onCellClick(p.cycleKey, (p as { _eventDate?: string })._eventDate ?? "");
        }
      }
    : undefined;

  return (
    <ChartSection>
      <ChartSurface title="Heterogeneidad por ciclo — mapa de posicionamiento">
        {/* Descripción para gerencia */}
        <div className="mb-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium text-foreground">Cómo leer este gráfico: </span>
          Cada punto es un ciclo (última fecha medida). La zona verde (abajo-izquierda) es lo
          deseable: baja heterogeneidad (CV) y alta uniformidad de alturas (Gini bajo). Los
          ciclos rojos requieren atención prioritaria.
        </div>

        {/* Scatter con zonas de fondo */}
        <div className="relative">
          {/* Corner labels — absolute over the chart */}
          <div
            className="pointer-events-none absolute inset-0 flex flex-col justify-between text-[10px] text-muted-foreground/60"
            style={{ paddingTop: 10, paddingBottom: 40, paddingLeft: 48, paddingRight: 20 }}
          >
            <div className="flex justify-between">
              <span>Baja heterogeneidad / Alta desigualdad</span>
              <span>Heterogéneo Y desigual</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-chart-success-bold)] font-medium">✓ Cultivo uniforme</span>
              <span>Heterogeneidad media-alta</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={340}>
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
              <CartesianGrid {...gridConfig} />

              {/* Background zones */}
              {/* Buena: CV < 0.25 AND Gini < 0.30 */}
              <ReferenceArea
                x1={0}
                x2={0.25}
                y1={0}
                y2={0.3}
                fill="var(--color-chart-success-soft, #22c55e)"
                fillOpacity={0.1}
                stroke="none"
              />
              {/* Problema: CV >= 0.40 AND Gini >= 0.50 */}
              <ReferenceArea
                x1={0.4}
                x2={1}
                y1={0.5}
                y2={1}
                fill="var(--color-chart-danger-soft, #ef4444)"
                fillOpacity={0.1}
                stroke="none"
              />
              {/* Alerta: the rest — CV 0.25-0.40 entire height */}
              <ReferenceArea
                x1={0.25}
                x2={0.4}
                y1={0}
                y2={1}
                fill="var(--color-chart-warning-soft, #f59e0b)"
                fillOpacity={0.08}
                stroke="none"
              />
              {/* Alerta: Gini 0.30-0.50 left column */}
              <ReferenceArea
                x1={0}
                x2={0.25}
                y1={0.3}
                y2={0.5}
                fill="var(--color-chart-warning-soft, #f59e0b)"
                fillOpacity={0.08}
                stroke="none"
              />

              <XAxis
                {...axisConfig}
                dataKey="cx"
                type="number"
                name="CV"
                domain={[0, 0.8]}
                label={{
                  value: "CV (heterogeneidad relativa)",
                  position: "insideBottom",
                  offset: -30,
                  style: { ...axisTickStyle, fill: "var(--color-muted-foreground)" },
                }}
                tickFormatter={(v: number) => fmtPct(v)}
                tick={{ ...axisTickStyle }}
              />
              <YAxis
                {...axisConfig}
                dataKey="cy"
                type="number"
                name="Gini"
                domain={[0, 1]}
                label={{
                  value: "Gini (desigualdad)",
                  angle: -90,
                  position: "insideLeft",
                  offset: 12,
                  style: { ...axisTickStyle, fill: "var(--color-muted-foreground)" },
                }}
                tickFormatter={(v: number) => formatDecimal(v)}
                tick={{ ...axisTickStyle }}
              />
              <ZAxis dataKey="cz" range={[30, 280]} />

              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={<CustomTooltip />}
              />

              {/* Render one Scatter per zona to get distinct colors */}
              {(["buena", "alerta", "problema"] as Zona[]).map((zona) => {
                const pts = validPoints.filter((p) => p.zona === zona);
                if (pts.length === 0) return null;
                return (
                  <Scatter
                    key={zona}
                    name={zonaLabel(zona)}
                    data={pts}
                    fill={zonaColor(zona)}
                    fillOpacity={0.85}
                    onClick={handleClick}
                    style={onCellClick ? { cursor: "pointer" } : undefined}
                  />
                );
              })}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Leyenda simple */}
        <div className="mt-2 flex flex-wrap gap-4 text-xs">
          {(["buena", "alerta", "problema"] as Zona[]).map((zona) => (
            <span key={zona} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: zonaColor(zona) }}
              />
              <span className="text-muted-foreground">
                {zonaLabel(zona)}{" "}
                <span className="tabular-nums text-foreground/60">
                  ({cyclePoints.filter((p) => p.zona === zona).length})
                </span>
              </span>
            </span>
          ))}
        </div>

        {/* Tabla de ciclos en zona PROBLEMA */}
        <div className="mt-5">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground/60">
            Ciclos en zona crítica (acción prioritaria)
          </h4>
          {problemCycles.length === 0 ? (
            <p className="text-xs text-[var(--color-chart-success-bold)]">
              ✓ Ningún ciclo en zona crítica.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ciclo</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Variedad</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">CV</th>
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Gini</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Bloque</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Recomendación</th>
                  </tr>
                </thead>
                <tbody>
                  {problemCycles.map((row) => (
                    <tr
                      key={row.cycleKey}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/20"
                      onClick={
                        onCellClick
                          ? () => onCellClick(row.cycleKey, row.eventDate)
                          : undefined
                      }
                      style={onCellClick ? { cursor: "pointer" } : undefined}
                    >
                      <td className="px-3 py-2 font-mono text-foreground">{row.cycleKey}</td>
                      <td className="px-3 py-2 text-foreground/80">
                        {[row.variety, row.spType].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td
                        className="px-3 py-2 text-right tabular-nums font-medium"
                        style={{ color: "var(--color-chart-danger)" }}
                      >
                        {fmtPct(row.cv)}
                      </td>
                      <td
                        className="px-3 py-2 text-right tabular-nums font-medium"
                        style={{ color: "var(--color-chart-danger)" }}
                      >
                        {row.gini !== null ? formatDecimal(row.gini) : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.parentBlock}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {buildRecommendation(row.cv, row.gini)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ChartSurface>
    </ChartSection>
  );
}
