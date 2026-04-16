/**
 * Paleta global de charts basada en tokens CSS.
 * Evitar hardcodes directos en componentes.
 */
export const SERIES_COLORS = [
  "var(--chart-line-primary)",
  "var(--color-chart-success-bold)",
  "var(--color-chart-info-bold)",
  "var(--color-chart-warning)",
  "var(--chart-line-secondary)",
  "var(--color-chart-success)",
  "var(--color-chart-info)",
  "var(--color-chart-danger)",
] as const;

export const COLOR_INGRESOS = "var(--color-chart-success-bold)";
export const COLOR_SALIDAS = "var(--color-chart-danger)";
export const COLOR_ACTIVOS = "var(--color-foreground)";
export const COLOR_PRIMARY = "var(--chart-line-primary)";
export const COLOR_WARNING = "var(--color-chart-warning)";
export const COLOR_DANGER = "var(--color-chart-danger)";
