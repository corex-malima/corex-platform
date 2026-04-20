"use client";

import { Archive, ChevronDown, ChevronUp, Pencil, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import type { MyWorkSpace, SpaceFormValue } from "@/modules/my-work/server/types";

const COLOR_DOT: Record<string, string> = {
  slate:   "bg-slate-400",
  sky:     "bg-sky-400",
  emerald: "bg-emerald-400",
  amber:   "bg-amber-400",
  rose:    "bg-rose-400",
};

const COLOR_BADGE: Record<string, string> = {
  slate:   "bg-slate-100   text-slate-700   dark:bg-slate-800   dark:text-slate-300",
  sky:     "bg-sky-100     text-sky-700     dark:bg-sky-900     dark:text-sky-300",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  amber:   "bg-amber-100   text-amber-700   dark:bg-amber-900   dark:text-amber-300",
  rose:    "bg-rose-100    text-rose-700    dark:bg-rose-900    dark:text-rose-300",
};

const COLOR_LABELS: Record<string, string> = {
  slate: "Gris", sky: "Azul", emerald: "Verde", amber: "Ambar", rose: "Rosa",
};

type Props = {
  spaces: MyWorkSpace[];
  onEdit: (value: SpaceFormValue) => void;
  onNew: () => void;
  onReorder: (spaceId: string, newSortOrder: number) => void;
};

export function SpacesPanel({ spaces, onEdit, onNew, onReorder }: Props) {
  const active = spaces
    .filter((s) => !s.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const archived = spaces.filter((s) => s.isArchived);

  function move(index: number, direction: -1 | 1) {
    const target = active[index];
    const swap = active[index + direction];
    if (!target || !swap) return;
    onReorder(target.id, swap.sortOrder);
    onReorder(swap.id, target.sortOrder);
  }

  return (
    <div className="rounded-[20px] border border-border/60 bg-card/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Espacios</p>
          <p className="text-xs text-muted-foreground">{active.length} activo{active.length !== 1 ? "s" : ""}{archived.length > 0 ? `, ${archived.length} archivado${archived.length !== 1 ? "s" : ""}` : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onNew}>
          <Plus className="size-3.5" />
          Nuevo
        </Button>
      </div>

      <div className="space-y-1.5">
        {active.map((space, index) => (
          <div
            key={space.id}
            className="flex items-center gap-3 rounded-[14px] border border-border/40 bg-background/60 px-3 py-2.5"
          >
            {/* Dot color */}
            <span className={cn("size-2.5 shrink-0 rounded-full", COLOR_DOT[space.colorToken] ?? "bg-slate-400")} />

            {/* Name + badges */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{space.name}</p>
              <div className="mt-0.5 flex flex-wrap gap-1">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", COLOR_BADGE[space.colorToken] ?? COLOR_BADGE.slate)}>
                  {COLOR_LABELS[space.colorToken] ?? space.colorToken}
                </span>
                {space.isDefault && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Principal
                  </span>
                )}
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                  #{space.sortOrder}
                </span>
              </div>
            </div>

            {/* Reorder */}
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label="Subir espacio"
                className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                disabled={index === active.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Bajar espacio"
                className="flex size-5 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="size-3" />
              </button>
            </div>

            {/* Edit */}
            <button
              type="button"
              onClick={() => onEdit({ id: space.id, name: space.name, colorToken: space.colorToken, sortOrder: space.sortOrder })}
              aria-label={`Editar ${space.name}`}
              className="flex size-7 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>
        ))}

        {archived.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="px-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">Archivados</p>
            {archived.map((space) => (
              <div key={space.id} className="flex items-center gap-3 rounded-[14px] border border-border/30 bg-background/30 px-3 py-2 opacity-60">
                <Archive className="size-3 shrink-0 text-muted-foreground" />
                <p className="truncate text-sm text-muted-foreground">{space.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
