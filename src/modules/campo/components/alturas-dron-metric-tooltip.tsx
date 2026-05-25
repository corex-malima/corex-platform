"use client";

import { HelpCircle } from "lucide-react";

export type AlturasDronMetricKey =
  | "mean"
  | "median"
  | "sd"
  | "iqr"
  | "mad"
  | "rSiqr"
  | "rSmad"
  | "cv"
  | "rCviqr"
  | "rCvmad"
  | "p10"
  | "p25"
  | "p75"
  | "p90"
  | "bowleyV1"
  | "bowleyV2"
  | "fisher"
  | "gini"
  | "entropyNorm"
  | "vegetativeDay";

export const ALTURAS_DRON_METRIC_DEFINITIONS: Record<
  AlturasDronMetricKey,
  { name: string; what: string; how: string }
> = {
  mean: {
    name: "E[x]",
    what: "Media (altura promedio).",
    how: "Indicador principal de altura del cultivo. Alta = cultivo desarrollado.",
  },
  median: {
    name: "Me(x)",
    what: "Mediana (centro robusto).",
    how: "Igual que la media pero resistente a outliers.",
  },
  sd: {
    name: "S(x)",
    what: "Desviación estándar clásica.",
    how: "Mide dispersión absoluta. Sensible a outliers.",
  },
  iqr: {
    name: "IQR",
    what: "Rango intercuartílico (Q3-Q1).",
    how: "Dispersión del 50% central.",
  },
  mad: {
    name: "MAD",
    what: "Mediana de las desviaciones absolutas a la mediana.",
    how: "Dispersión robusta a outliers.",
  },
  rSiqr: {
    name: "rSiqr",
    what: "SD robusta basada en IQR (IQR / 1.349).",
    how: "Alternativa a S(x) menos sensible a outliers.",
  },
  rSmad: {
    name: "rSmad",
    what: "SD robusta basada en MAD (1.4826 × MAD).",
    how: "La más robusta a outliers extremos.",
  },
  cv: {
    name: "CV",
    what: "Coeficiente de variación clásico (S/E).",
    how: "<25% homogéneo · <40% alerta · ≥40% problema.",
  },
  rCviqr: {
    name: "rCViqr",
    what: "CV robusto vía IQR (rSiqr / mediana).",
    how: "Misma escala que CV pero estable a outliers.",
  },
  rCvmad: {
    name: "rCVmad",
    what: "CV robusto vía MAD (rSmad / mediana).",
    how: "El más resistente a valores extremos.",
  },
  p10: {
    name: "P10",
    what: "Percentil 10.",
    how: "El 10% de píxeles está por debajo de esta altura.",
  },
  p25: {
    name: "Q1 (P25)",
    what: "Primer cuartil.",
    how: "El 25% está por debajo.",
  },
  p75: {
    name: "Q3 (P75)",
    what: "Tercer cuartil.",
    how: "El 75% está por debajo.",
  },
  p90: {
    name: "P90",
    what: "Percentil 90.",
    how: "El 90% está por debajo.",
  },
  bowleyV1: {
    name: "Bowley V1",
    what: "Asimetría amplia: (P90+P10-2Me)/(P90-P10).",
    how: "<-0.2 cola hacia alturas bajas · >0.2 cola hacia alturas altas.",
  },
  bowleyV2: {
    name: "Bowley V2",
    what: "Asimetría central: (Q3+Q1-2Me)/(Q3-Q1).",
    how: "Foco en el cuerpo de la distribución.",
  },
  fisher: {
    name: "Fisher",
    what: "Asimetría clásica basada en momentos: E[(x-μ)³]/S³.",
    how: "Sensible a colas extremas.",
  },
  gini: {
    name: "Gini (g)",
    what: "Coeficiente de Gini de la distribución de alturas.",
    how: "0 = todas las alturas iguales · 1 = totalmente desigual.",
  },
  entropyNorm: {
    name: "Hn",
    what: "Entropía de Shannon normalizada (H/ln K).",
    how: "0 = un solo rango dominante · 1 = totalmente diverso.",
  },
  vegetativeDay: {
    name: "Día Vegetativo",
    what: "Días desde sp_date (fecha de siembra).",
    how: "Permite comparar ciclos en la misma etapa de desarrollo.",
  },
};

export function AlturasDronMetricTooltip({ metric }: { metric: AlturasDronMetricKey }) {
  const def = ALTURAS_DRON_METRIC_DEFINITIONS[metric];
  if (!def) return null;

  return (
    <span
      className="inline-flex items-center gap-1 cursor-help"
      title={`${def.name} — ${def.what}\nCómo se interpreta: ${def.how}`}
    >
      <HelpCircle className="size-3.5 text-muted-foreground" aria-hidden="true" />
    </span>
  );
}
