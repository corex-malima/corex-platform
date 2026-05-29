"use client";

import { cn } from "@/lib/utils";
import {
  type FenogramaWhiteBoxesBasis,
  WHITE_BOXES_BASIS_META,
} from "@/lib/fenograma-types";

const ORDER: FenogramaWhiteBoxesBasis[] = ["event_date", "post_event_at"];

/**
 * Sub-toggle exclusivo de la métrica "Cajas blanco".
 *
 * - "Fecha corte"   (event_date)   → default. Agrupa cajas blanco por la semana
 *                                    del corte de tallos. Coherente con tallos y verde.
 * - "Fecha balanza" (post_event_at) → semana del procesado en balanza.
 *                                    Canon legacy de gld.mv_prod_productivity_post_cur.
 *
 * El componente reutiliza el patrón visual de ToggleChipGroup pero con
 * semántica single-select (radio-like).
 */
export function FenogramaWhiteBoxesBasisToggle({
  value,
  onChange,
  className,
}: {
  value: FenogramaWhiteBoxesBasis;
  onChange: (value: FenogramaWhiteBoxesBasis) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)} role="group" aria-label="Cajas blanco: agrupar por">
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Cajas blanco — agrupar por
      </span>
      {ORDER.map((option) => {
        const meta = WHITE_BOXES_BASIS_META[option];
        const active = value === option;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            title={meta.hint}
            onClick={() => onChange(option)}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-slate-700/40 bg-slate-900/20 text-foreground dark:border-slate-600/40 dark:bg-slate-900/30"
                : "border-border/70 bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {meta.label}
          </button>
        );
      })}
    </div>
  );
}
