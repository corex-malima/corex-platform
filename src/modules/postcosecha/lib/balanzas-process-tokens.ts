import type { BalanzasLaneId } from "@/lib/postcosecha-balanzas";

/**
 * Canonical color constants for the Balanzas BPMN process viewer.
 * Direct values required because bpmn-js renders SVG/HTML outside the React
 * tree, making CSS custom properties and Tailwind classes unavailable.
 * Documented exception: docs/ui-canon.md → .balanzas-process
 */

export const BALANZAS_LANE_COLORS = {
  "pre-gv":             "#2563eb",
  "pre-directo":        "#0891b2",
  "apertura-gv-pelado": "#16a34a",
  "apertura-apertura":  "#f97316",
} as const satisfies Record<BalanzasLaneId, string>;

export const BALANZAS_OVERLAY_CLASSES = {
  aggregate: "border-orange-200/80 bg-orange-50/98 text-orange-950 dark:border-orange-500/30 dark:bg-orange-950/80 dark:text-orange-100",
  metric:    "border-slate-200/80 bg-white/98 text-slate-900 dark:border-slate-700/60 dark:bg-slate-950/90 dark:text-slate-100",
} as const;

export const BALANZAS_OVERLAY_INLINE_COLORS = {
  aggregateLabel: "color:rgba(154,52,18,0.75)",
  aggregateValue: "color:rgba(154,52,18,0.9)",
  metricLabel:    "color:rgba(100,116,139,0.85)",
  metricValue:    "color:rgba(71,85,105,0.9)",
} as const;
