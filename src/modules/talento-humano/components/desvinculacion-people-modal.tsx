"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";

import type { TalentoExitRecord } from "@/lib/talento-humano";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/shared/data-display/empty-state";
import { formatDateSlash, formatInteger, formatPercent } from "@/shared/lib/format";
import { DialogShell } from "@/shared/overlays/dialog-shell";
import { Input } from "@/shared/ui/input";
import { PersonInfoOverlay } from "@/modules/talento-humano/components/person-info-overlay";

function getComplianceTone(value: number | null) {
  if (value === null) return "neutral";
  if (value > 1) return "success";
  if (value >= 0.9) return "warning";
  return "danger";
}

function toneClass(tone: ReturnType<typeof getComplianceTone>) {
  if (tone === "success") return "text-[var(--color-chart-success-bold)]";
  if (tone === "warning") return "text-[var(--color-chart-warning)]";
  if (tone === "danger") return "text-[var(--color-chart-danger)]";
  return "text-muted-foreground";
}

function textOrDash(value: string | null | undefined) {
  return value?.trim() || "-";
}

export function ExitPeopleModal({
  title,
  rows,
  onClose,
}: {
  title: string;
  rows: TalentoExitRecord[];
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<TalentoExitRecord | null>(null);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [
        row.personId,
        row.personName,
        row.nationalId,
        row.exitReason,
        row.resignationReason,
        row.resignationCategory,
        row.observations,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  return (
    <>
      <DialogShell
        title={title}
        description={`${formatInteger(rows.length)} desvinculaciones`}
        onClose={onClose}
        maxWidth="max-w-6xl"
        headerActions={(
          <button type="button" onClick={onClose} className="rounded-[10px] p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Cerrar listado">
            <X className="size-4" />
          </button>
        )}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, ID, cedula, motivo u observacion..." className="pl-8" />
          </div>
          {filteredRows.length ? (
            <div className="max-h-[68vh] space-y-3 overflow-auto pr-2">
              {filteredRows.map((row) => (
                <button
                  key={`${row.personId}-${row.entryDate}-${row.exitDate}-${row.resignationCategory ?? "na"}`}
                  type="button"
                  onClick={() => setSelectedPerson(row)}
                  className="w-full rounded-[20px] border border-border/70 bg-background/80 p-4 text-left transition hover:border-primary/30 hover:bg-muted/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{row.personName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        ID {row.personId} · Salida {formatDateSlash(row.exitDate ?? row.lastExitDate)}
                      </p>
                    </div>
                    <span className={cn("rounded-full bg-muted px-3 py-1 text-xs font-semibold tabular-nums", toneClass(getComplianceTone(row.cumplimiento)))}>
                      {formatPercent(row.cumplimiento, { input: "ratio" })}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <InfoBlock label="Motivo" value={textOrDash(row.exitReason ?? row.resignationReason)} />
                    <InfoBlock label="Categoria" value={textOrDash(row.resignationCategory)} />
                    <InfoBlock label="Clasificacion" value={textOrDash(row.resignationClassification)} />
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <InfoBlock label="Area" value={textOrDash(row.areaName)} />
                    <InfoBlock label="Cargo" value={textOrDash(row.jobTitle)} />
                    <InfoBlock label="TS" value={textOrDash(row.associatedWorkerName)} />
                  </div>
                  <InfoBlock className="mt-3" label="Observacion" value={textOrDash(row.observations)} />
                </button>
              ))}
            </div>
          ) : (
            <EmptyState label="Sin resultados." />
          )}
        </div>
      </DialogShell>
      {selectedPerson ? <PersonInfoOverlay personId={selectedPerson.personId} personName={selectedPerson.personName} onClose={() => setSelectedPerson(null)} /> : null}
    </>
  );
}

function InfoBlock({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("rounded-[14px] border border-border/60 bg-card/70 px-3 py-2", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 whitespace-normal break-words text-xs leading-relaxed text-foreground">{value}</p>
    </div>
  );
}
