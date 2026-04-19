"use client";

import { LoaderCircle, Save, ShieldAlert } from "lucide-react";

import { EmptyState } from "@/shared/data-display/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { cn } from "@/lib/utils";
import { formatInteger } from "@/shared/lib/format";
import type { DeadPlantsReseedCaptureRow } from "@/lib/dead-plants-reseed";

function parseCountInput(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
}

export function CapturePanel({
  canWrite,
  countLabel,
  rows,
  values,
  setValues,
  isLoading,
  error,
  blockedCount,
  editableCount,
  total,
  onSave,
  isSaving,
}: {
  canWrite: boolean;
  countLabel: string;
  rows: DeadPlantsReseedCaptureRow[];
  values: Record<string, number>;
  setValues: (values: Record<string, number>) => void;
  isLoading: boolean;
  error?: Error;
  blockedCount: number;
  editableCount: number;
  total: number;
  onSave: () => void;
  isSaving: boolean;
}) {
  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-[18px] bg-muted" />;
  }

  if (error) {
    return (
      <p className="rounded-[16px] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
        {error.message}
      </p>
    );
  }

  if (rows.length === 0) {
    return <EmptyState label="Selecciona fecha y bloque para cargar las camas." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="rounded-full px-3 py-1">{formatInteger(editableCount)} editables</Badge>
        <Badge variant={blockedCount ? "danger" : "success"} className="rounded-full px-3 py-1">{formatInteger(blockedCount)} bloqueadas</Badge>
        <Badge variant="outline" className="rounded-full px-3 py-1">Total: {formatInteger(total)}</Badge>
      </div>

      {!canWrite ? (
        <div className="flex items-center gap-2 rounded-[16px] border border-amber-300/40 bg-amber-100/40 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          <ShieldAlert className="size-4" aria-hidden="true" />
          Tu rol permite consulta, no creacion ni edicion.
        </div>
      ) : null}

      <ScrollFadeTable className="border border-border/70">
        <table className="min-w-[760px] w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-card/95 backdrop-blur">
            <tr>
              <th className="border-b border-r border-border/70 px-3 py-3 text-left font-semibold">Cama</th>
              <th className="border-b border-r border-border/70 px-3 py-3 text-left font-semibold">Ciclo</th>
              <th className="border-b border-r border-border/70 px-3 py-3 text-left font-semibold">Estado</th>
              <th className="border-b border-border/70 px-3 py-3 text-right font-semibold">{countLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.bedId} className={cn(index % 2 === 0 ? "bg-background/84" : "bg-background/70", row.blocked && "opacity-75")}>
                <td className="border-b border-r border-border/50 px-3 py-2.5 font-medium">{row.bedPosition}</td>
                <td className="border-b border-r border-border/50 px-3 py-2.5 text-xs text-muted-foreground">{row.cycleKey ?? "-"}</td>
                <td className="border-b border-r border-border/50 px-3 py-2.5">
                  {row.blocked ? (
                    <div className="space-y-1">
                      <Badge variant="danger">Bloqueada</Badge>
                      <p className="max-w-[280px] text-[11px] text-muted-foreground">{row.blockedReason}</p>
                    </div>
                  ) : (
                    <Badge variant="success">Disponible</Badge>
                  )}
                </td>
                <td className="border-b border-border/50 px-3 py-2.5 text-right">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={row.blocked ? row.existingValue ?? 0 : values[row.bedId] ?? 0}
                    disabled={row.blocked || !canWrite}
                    onChange={(event) => setValues({ ...values, [row.bedId]: parseCountInput(event.target.value) })}
                    className="ml-auto w-28 text-right tabular-nums"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollFadeTable>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button onClick={onSave} disabled={!canWrite || isSaving || editableCount === 0}>
          {isSaving ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          Guardar captura
        </Button>
      </div>
    </div>
  );
}
