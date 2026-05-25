"use client";

import {
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  ReferenceArea,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { ChartSection } from "@/shared/layout/filter-panel";
import { ChartSurface } from "@/shared/data-display/chart-surface";
import { EmptyState } from "@/shared/data-display/empty-state";
import { RechartsTooltipAdapter } from "@/shared/charts/chart-tooltip";
import { axisConfig, axisTickStyle, gridConfig } from "@/shared/charts";
import { formatDecimal } from "@/shared/lib/format";
import type { AlturasDronStatsRow } from "@/lib/campo-alturas-dron";

type Props = {
  stats: AlturasDronStatsRow[];
};

// ─── Gini helpers ─────────────────────────────────────────────────────────────
type GiniZona = "buena" | "alerta" | "critica";
function getGiniZona(v: number | null): GiniZona {
  if (v === null) return "alerta";
  if (v <= 0.3) return "buena";
  if (v <= 0.5) return "alerta";
  return "critica";
}
function getGiniColor(v: number | null): string {
  const zona = getGiniZona(v);
  if (zona === "buena") return "var(--color-chart-success-bold)";
  if (zona === "alerta") return "var(--color-chart-warning)";
  return "var(--color-chart-danger)";
}
function getGiniZonaLabel(v: number | null): string {
  const zona = getGiniZona(v);
  if (zona === "buena") return "BUENO: distribución uniforme (< 0.30)";
  if (zona === "alerta") return "ALERTA: distribución desigual (0.30 – 0.50)";
  return "CRÍTICO: distribución muy desigual (> 0.50)";
}
function getGiniSugerencia(v: number | null): string {
  const zona = getGiniZona(v);
  if (zona === "buena") return "Cultivo homogéneo, seguimiento rutinario";
  if (zona === "alerta") return "Revisar zonas con plantas más bajas";
  return "Investigar focos de crecimiento irregular urgente";
}

// ─── Bowley helpers ───────────────────────────────────────────────────────────
type BowleyZona = "izq" | "neutro" | "der";
function getBowleyZona(v: number | null): BowleyZona {
  if (v === null) return "neutro";
  if (v < -0.2) return "izq";
  if (v <= 0.2) return "neutro";
  return "der";
}
function getBowleyColor(v: number | null): string {
  const zona = getBowleyZona(v);
  if (zona === "izq") return "var(--color-chart-info-bold)";
  if (zona === "neutro") return "var(--color-chart-success-bold)";
  return "var(--color-chart-warning)";
}
function getBowleyZonaLabel(v: number | null): string {
  const zona = getBowleyZona(v);
  if (zona === "izq") return "COLA BAJA: mayoría de plantas por debajo de la media (< -0.2)";
  if (zona === "neutro") return "NEUTRO: distribución simétrica (-0.2 a 0.2)";
  return "COLA ALTA: mayoría de plantas por encima de la media (> 0.2)";
}
function getBowleySugerencia(v: number | null): string {
  const zona = getBowleyZona(v);
  if (zona === "izq") return "Revisar causas de retraso en plantas cortas";
  if (zona === "neutro") return "Distribución normal, sin sesgo significativo";
  return "Evaluar si el avance de alturas es sostenible";
}

// ─── Entropy helpers ──────────────────────────────────────────────────────────
type HnZona = "bajo" | "medio" | "alto";
function getHnZona(v: number | null): HnZona {
  if (v === null) return "bajo";
  if (v < 0.3) return "bajo";
  if (v < 0.6) return "medio";
  return "alto";
}
function getHnColor(v: number | null): string {
  const zona = getHnZona(v);
  if (zona === "bajo") return "var(--color-muted-foreground)";
  if (zona === "medio") return "var(--color-chart-info-bold)";
  return "var(--color-chart-success-bold)";
}
function getHnZonaLabel(v: number | null): string {
  const zona = getHnZona(v);
  if (zona === "bajo") return "BAJA DIVERSIDAD: alturas muy concentradas (< 0.30)";
  if (zona === "medio") return "DIVERSIDAD MEDIA: mezcla moderada de alturas (0.30 – 0.60)";
  return "ALTA DIVERSIDAD: amplia mezcla de alturas (> 0.60)";
}
function getHnSugerencia(v: number | null): string {
  const zona = getHnZona(v);
  if (zona === "bajo") return "Ciclo homogéneo en altura — estado esperado";
  if (zona === "medio") return "Revisar si la mezcla corresponde al estado fenológico";
  return "Alta variabilidad — confirmar si es normal en este estado del ciclo";
}

// ─── Counter footer ───────────────────────────────────────────────────────────
function ZonaCounter({
  buena,
  alerta,
  critica,
  labelBuena = "zona buena",
  labelAlerta = "en alerta",
  labelCritica = "requieren atención",
}: {
  buena: number;
  alerta: number;
  critica: number;
  labelBuena?: string;
  labelAlerta?: string;
  labelCritica?: string;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-3 text-xs">
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-chart-success-bold)]" />
        <span className="text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{buena}</span> {labelBuena}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-chart-warning)]" />
        <span className="text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{alerta}</span> {labelAlerta}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-chart-danger)]" />
        <span className="text-muted-foreground">
          <span className="tabular-nums font-medium text-foreground">{critica}</span> {labelCritica}
        </span>
      </span>
    </div>
  );
}

// ─── Shared payload type ──────────────────────────────────────────────────────
type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  payload?: Record<string, unknown>;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export function AlturasDronVariabilityCharts({ stats }: Props) {
  if (!stats || stats.length === 0) {
    return (
      <ChartSection>
        <div className="grid gap-4 xl:grid-cols-3">
          {["Desigualdad interna (Gini)", "Asimetría amplia (Bowley V1)", "Diversidad (Hn)"].map(
            (title) => (
              <ChartSurface key={title} title={title}>
                <EmptyState label="No hay datos disponibles" />
              </ChartSurface>
            ),
          )}
        </div>
      </ChartSection>
    );
  }

  // Prepare data for each chart — keyed by cycleKey (not parentBlock)
  const giniData = [...stats]
    .filter((s) => s.gini !== null && s.gini !== undefined)
    .sort((a, b) => (b.gini ?? 0) - (a.gini ?? 0));

  const bowleyData = [...stats]
    .filter((s) => s.bowleyV1 !== null && s.bowleyV1 !== undefined)
    .sort((a, b) => (a.bowleyV1 ?? 0) - (b.bowleyV1 ?? 0));

  const entropyData = [...stats]
    .filter((s) => s.entropyNorm !== null && s.entropyNorm !== undefined)
    .sort((a, b) => (b.entropyNorm ?? 0) - (a.entropyNorm ?? 0));

  const hasGiniData = giniData.length > 0;
  const hasBowleyData = bowleyData.length > 0;
  const hasEntropyData = entropyData.length > 0;

  // Counters
  const giniCount = {
    buena: giniData.filter((r) => getGiniZona(r.gini) === "buena").length,
    alerta: giniData.filter((r) => getGiniZona(r.gini) === "alerta").length,
    critica: giniData.filter((r) => getGiniZona(r.gini) === "critica").length,
  };
  const bowleyCount = {
    buena: bowleyData.filter((r) => getBowleyZona(r.bowleyV1) === "neutro").length,
    alerta: bowleyData.filter((r) => getBowleyZona(r.bowleyV1) === "der").length,
    critica: bowleyData.filter((r) => getBowleyZona(r.bowleyV1) === "izq").length,
  };
  const hnCount = {
    buena: entropyData.filter((r) => getHnZona(r.entropyNorm) === "bajo").length,
    alerta: entropyData.filter((r) => getHnZona(r.entropyNorm) === "medio").length,
    critica: entropyData.filter((r) => getHnZona(r.entropyNorm) === "alto").length,
  };

  return (
    <ChartSection>
      <div className="grid gap-6 xl:grid-cols-3">
        {/* ── Gini Chart ── */}
        <ChartSurface title="Desigualdad interna (Gini)">
          {/* Descripción */}
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Mide qué tan desigual está distribuida la altura entre los píxeles del bloque.{" "}
            <span className="text-foreground/70">0 = todas las plantas iguales · 1 = totalmente desigual.</span>{" "}
            <span className="font-medium text-[var(--color-chart-success-bold)]">Lo bueno: &lt; 0.30.</span>
          </p>

          {hasGiniData ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={giniData} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
                  {/* Background zones */}
                  <ReferenceArea y1={0} y2={0.3} fill="var(--color-chart-success-soft, #22c55e)" fillOpacity={0.1} stroke="none" />
                  <ReferenceArea y1={0.3} y2={0.5} fill="var(--color-chart-warning-soft, #f59e0b)" fillOpacity={0.1} stroke="none" />
                  <ReferenceArea y1={0.5} y2={1} fill="var(--color-chart-danger-soft, #ef4444)" fillOpacity={0.1} stroke="none" />

                  <CartesianGrid {...gridConfig} />
                  <XAxis
                    {...axisConfig}
                    dataKey="cycleKey"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ ...axisTickStyle }}
                  />
                  <YAxis
                    {...axisConfig}
                    tick={{ ...axisTickStyle }}
                    domain={[0, 1]}
                    tickFormatter={(v: number) => formatDecimal(v)}
                  />

                  {/* Threshold lines */}
                  <ReferenceLine
                    y={0.3}
                    stroke="var(--color-chart-success-bold)"
                    strokeDasharray="4 2"
                    label={{ value: "Aceptable", position: "insideTopRight", style: { ...axisTickStyle, fill: "var(--color-chart-success-bold)", fontSize: 9 } }}
                  />
                  <ReferenceLine
                    y={0.5}
                    stroke="var(--color-chart-danger)"
                    strokeDasharray="4 2"
                    label={{ value: "Crítico", position: "insideTopRight", style: { ...axisTickStyle, fill: "var(--color-chart-danger)", fontSize: 9 } }}
                  />

                  <Tooltip
                    content={({ active, payload, label }) =>
                      payload ? (
                        <RechartsTooltipAdapter
                          active={active}
                          payload={payload as TooltipPayloadItem[]}
                          label={label}
                          mapPayload={(p) => {
                            const row = p[0]?.payload as AlturasDronStatsRow | undefined;
                            const val = row?.gini ?? null;
                            return [
                              { label: "Ciclo", value: String(label) },
                              ...(row?.variety ? [{ label: "Variedad", value: String(row.variety) }] : []),
                              { label: "Gini", value: val !== null ? formatDecimal(val) : "—" },
                              { label: "Zona", value: getGiniZonaLabel(val) },
                              { label: "Sugerencia", value: getGiniSugerencia(val) },
                            ];
                          }}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="gini" fill="var(--color-muted)">
                    {giniData.map((entry, idx) => (
                      <Cell key={`gini-${idx}`} fill={getGiniColor(entry.gini)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ZonaCounter
                buena={giniCount.buena}
                alerta={giniCount.alerta}
                critica={giniCount.critica}
                labelCritica="requieren atención"
              />
            </>
          ) : (
            <EmptyState label="No hay datos de Gini" />
          )}
        </ChartSurface>

        {/* ── Bowley V1 Chart ── */}
        <ChartSurface title="Asimetría amplia (Bowley V1)">
          {/* Descripción */}
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Indica si el bloque tiene cola hacia plantas altas (&gt;0) o hacia plantas bajas (&lt;0).{" "}
            <span className="font-medium text-[var(--color-chart-success-bold)]">Lo neutro: entre -0.2 y 0.2.</span>
          </p>

          {hasBowleyData ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bowleyData} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
                  {/* Background zones */}
                  <ReferenceArea y1={-1} y2={-0.2} fill="var(--color-chart-info-soft, #3b82f6)" fillOpacity={0.1} stroke="none" />
                  <ReferenceArea y1={-0.2} y2={0.2} fill="var(--color-chart-success-soft, #22c55e)" fillOpacity={0.1} stroke="none" />
                  <ReferenceArea y1={0.2} y2={1} fill="var(--color-chart-warning-soft, #f59e0b)" fillOpacity={0.1} stroke="none" />

                  <CartesianGrid {...gridConfig} />
                  <XAxis
                    {...axisConfig}
                    dataKey="cycleKey"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ ...axisTickStyle }}
                  />
                  <YAxis
                    {...axisConfig}
                    tick={{ ...axisTickStyle }}
                    domain={[-1, 1]}
                    tickFormatter={(v: number) => formatDecimal(v)}
                  />

                  {/* Threshold lines */}
                  <ReferenceLine
                    y={0}
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                  />
                  <ReferenceLine
                    y={-0.2}
                    stroke="var(--color-chart-success-bold)"
                    strokeDasharray="4 2"
                    label={{ value: "Banda neutra", position: "insideTopRight", style: { ...axisTickStyle, fill: "var(--color-chart-success-bold)", fontSize: 9 } }}
                  />
                  <ReferenceLine
                    y={0.2}
                    stroke="var(--color-chart-success-bold)"
                    strokeDasharray="4 2"
                  />

                  <Tooltip
                    content={({ active, payload, label }) =>
                      payload ? (
                        <RechartsTooltipAdapter
                          active={active}
                          payload={payload as TooltipPayloadItem[]}
                          label={label}
                          mapPayload={(p) => {
                            const row = p[0]?.payload as AlturasDronStatsRow | undefined;
                            const val = row?.bowleyV1 ?? null;
                            return [
                              { label: "Ciclo", value: String(label) },
                              ...(row?.variety ? [{ label: "Variedad", value: String(row.variety) }] : []),
                              { label: "Bowley V1", value: val !== null ? formatDecimal(val) : "—" },
                              { label: "Zona", value: getBowleyZonaLabel(val) },
                              { label: "Sugerencia", value: getBowleySugerencia(val) },
                            ];
                          }}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="bowleyV1" fill="var(--color-muted)">
                    {bowleyData.map((entry, idx) => (
                      <Cell key={`bowley-${idx}`} fill={getBowleyColor(entry.bowleyV1)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ZonaCounter
                buena={bowleyCount.buena}
                alerta={bowleyCount.alerta}
                critica={bowleyCount.critica}
                labelBuena="neutros"
                labelAlerta="con cola alta"
                labelCritica="con cola baja"
              />
            </>
          ) : (
            <EmptyState label="No hay datos de Bowley V1" />
          )}
        </ChartSurface>

        {/* ── Entropy (Hn) Chart ── */}
        <ChartSurface title="Diversidad (Hn)">
          {/* Descripción */}
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
            Diversidad de alturas en el bloque.{" "}
            <span className="text-foreground/70">0 = monocultivo de altura · 1 = mucha mezcla.</span>{" "}
            <span className="font-medium text-muted-foreground">Lo aceptable depende del estado del ciclo.</span>
          </p>

          {hasEntropyData ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={entropyData} margin={{ top: 8, right: 16, left: 0, bottom: 80 }}>
                  {/* Background zones */}
                  <ReferenceArea y1={0} y2={0.3} fill="var(--color-muted)" fillOpacity={0.06} stroke="none" />
                  <ReferenceArea y1={0.3} y2={0.6} fill="var(--color-chart-info-soft, #3b82f6)" fillOpacity={0.08} stroke="none" />
                  <ReferenceArea y1={0.6} y2={1} fill="var(--color-chart-success-soft, #22c55e)" fillOpacity={0.1} stroke="none" />

                  <CartesianGrid {...gridConfig} />
                  <XAxis
                    {...axisConfig}
                    dataKey="cycleKey"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ ...axisTickStyle }}
                  />
                  <YAxis
                    {...axisConfig}
                    tick={{ ...axisTickStyle }}
                    domain={[0, 1]}
                    tickFormatter={(v: number) => formatDecimal(v)}
                  />

                  {/* Threshold lines */}
                  <ReferenceLine
                    y={0.3}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="4 2"
                    label={{ value: "Baja / Media", position: "insideTopRight", style: { ...axisTickStyle, fill: "var(--color-muted-foreground)", fontSize: 9 } }}
                  />
                  <ReferenceLine
                    y={0.6}
                    stroke="var(--color-chart-info-bold)"
                    strokeDasharray="4 2"
                    label={{ value: "Media / Alta", position: "insideTopRight", style: { ...axisTickStyle, fill: "var(--color-chart-info-bold)", fontSize: 9 } }}
                  />

                  <Tooltip
                    content={({ active, payload, label }) =>
                      payload ? (
                        <RechartsTooltipAdapter
                          active={active}
                          payload={payload as TooltipPayloadItem[]}
                          label={label}
                          mapPayload={(p) => {
                            const row = p[0]?.payload as AlturasDronStatsRow | undefined;
                            const val = row?.entropyNorm ?? null;
                            return [
                              { label: "Ciclo", value: String(label) },
                              ...(row?.variety ? [{ label: "Variedad", value: String(row.variety) }] : []),
                              { label: "Hn", value: val !== null ? formatDecimal(val) : "—" },
                              { label: "Zona", value: getHnZonaLabel(val) },
                              { label: "Sugerencia", value: getHnSugerencia(val) },
                            ];
                          }}
                        />
                      ) : null
                    }
                  />
                  <Bar dataKey="entropyNorm" fill="var(--color-muted)">
                    {entropyData.map((entry, idx) => (
                      <Cell key={`hn-${idx}`} fill={getHnColor(entry.entropyNorm)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ZonaCounter
                buena={hnCount.buena}
                alerta={hnCount.alerta}
                critica={hnCount.critica}
                labelBuena="baja diversidad"
                labelAlerta="diversidad media"
                labelCritica="alta diversidad"
              />
            </>
          ) : (
            <EmptyState label="No hay datos de Hn" />
          )}
        </ChartSurface>
      </div>
    </ChartSection>
  );
}
