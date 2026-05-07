import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type InfoFieldProps = {
  /** Etiqueta corta tipo eyebrow encima del valor. */
  label: string;
  /** Valor a mostrar. Si es null/undefined/"" se muestra el `placeholder`. */
  value?: string | number | null;
  /** Texto a mostrar cuando no hay valor. Default: "—". */
  placeholder?: string;
  /** Slot opcional para nodos custom (badges, chips). Si se usa, ignora `value`. */
  children?: ReactNode;
  className?: string;
};

/**
 * Campo de información canon para fichas y cards de detalle.
 *
 * Estructura: eyebrow (label uppercase) + value (medio peso). Reemplaza
 * implementaciones locales tipo `MiniField`.
 *
 * Uso típico dentro de `Card` / `CardContent`:
 *
 * ```tsx
 * <div className="grid gap-3 sm:grid-cols-2">
 *   <InfoField label="Cargo" value={detail.position} />
 *   <InfoField label="Área" value={detail.area} />
 * </div>
 * ```
 */
export function InfoField({
  label,
  value,
  placeholder = "—",
  children,
  className,
}: InfoFieldProps) {
  const hasValue = value !== undefined && value !== null && value !== "";
  const display = hasValue ? value : placeholder;

  return (
    <div
      className={cn(
        "rounded-[16px] border border-border/60 bg-background/70 px-3 py-2",
        className,
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">
        {children ?? display}
      </div>
    </div>
  );
}
