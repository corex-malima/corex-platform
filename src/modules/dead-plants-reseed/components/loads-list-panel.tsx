"use client";

import { LoaderCircle } from "lucide-react";

import { EmptyState } from "@/shared/data-display/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime, formatInteger } from "@/shared/lib/format";
import type { DeadPlantsReseedLoadSummary } from "@/lib/dead-plants-reseed";

export function LoadsListPanel({
  title,
  loads,
  selectedRunId,
  isLoading,
  error,
  onSelect,
}: {
  title: string;
  loads: DeadPlantsReseedLoadSummary[];
  selectedRunId: string | null;
  isLoading: boolean;
  error?: Error;
  onSelect: (runId: string) => void;
}) {
  return (
    <Card className="bg-card/86">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Consulta de cargas</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ultimas cargas por bloque y fecha para {title}.
            </p>
          </div>
          {isLoading ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="rounded-[16px] border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {error.message}
          </p>
        ) : null}

        {loads.length === 0 ? (
          <EmptyState label="No hay cargas previas para el corte seleccionado." />
        ) : (
          <div className="space-y-2">
            {loads.map((load) => (
              <button
                key={`${load.type}-${load.runId}`}
                type="button"
                onClick={() => onSelect(load.runId)}
                className={cn(
                  "w-full rounded-[18px] border px-4 py-3 text-left transition-colors",
                  selectedRunId === load.runId
                    ? "border-primary/60 bg-primary/8"
                    : "border-border/70 bg-background/72 hover:bg-muted/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{load.blockId} - {formatDate(load.workDate)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatInteger(load.bedCount)} camas - {load.actorId ?? "sin actor"}
                    </p>
                  </div>
                  <Badge variant="outline" className="rounded-full px-3 py-1">
                    {formatInteger(load.totalValue)}
                  </Badge>
                </div>
                {load.loadedAt ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Cargado {formatDateTime(load.loadedAt)}
                  </p>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
