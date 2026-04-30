"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, History } from "lucide-react";
import useSWR from "swr";

import { fetchJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";
import { formatDate } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";
import type {
  EmployeeFollowupCatalogMap,
  EmployeeFollowupCatalogOption,
  EmployeeFollowupResponseDetail,
  EmployeeFollowupResponseSummary,
} from "@/modules/talento-humano/seguimientos/server/types";

type Props = {
  personId: string;
  currentUniqueFollowUpCode: string;
  catalogs: EmployeeFollowupCatalogMap;
};

const historyFetcher = (url: string) =>
  fetchJson<{ responses: EmployeeFollowupResponseSummary[] }>(url, "No se pudo cargar el historial.");

const detailFetcher = (url: string) =>
  fetchJson<EmployeeFollowupResponseDetail>(url, "No se pudo cargar el detalle.");

function buildLookup(catalogs: EmployeeFollowupCatalogMap) {
  const map = new Map<string, string>();
  for (const [code, items] of Object.entries(catalogs)) {
    for (const item of items as EmployeeFollowupCatalogOption[]) {
      map.set(`${code}::${item.itemCode}`, item.itemLabelEs);
    }
  }
  return map;
}

function KV({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  if (!value) return null;
  return (
    <div className={cn("rounded-[12px] border border-border/50 bg-background/60 px-2.5 py-1.5", wide && "col-span-2")}>
      <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-xs font-medium text-foreground">{value}</p>
    </div>
  );
}

function HistoryItemDetail({ eventId, catalogs }: { eventId: string; catalogs: EmployeeFollowupCatalogMap }) {
  const { data, isLoading } = useSWR(
    `/api/talento-humano/seguimientos/responses/${encodeURIComponent(eventId)}`,
    detailFetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  );

  if (isLoading) {
    return <p className="mt-2 text-center text-xs text-muted-foreground">Cargando...</p>;
  }
  if (!data) return null;

  const lk = buildLookup(catalogs);
  const label = (cat: string, v: string | null | undefined) =>
    v ? (lk.get(`${cat}::${v}`) ?? v) : null;

  const selOf = (group: string) =>
    data.selections
      .filter((s) => s.selectionGroupCode === group)
      .map((s) => {
        const base = label(s.catalogCode, s.itemCode) ?? s.itemCode;
        return s.otherDetail ? `${base}: ${s.otherDetail}` : base;
      })
      .join(", ") || null;

  return (
    <div className="mt-2 grid grid-cols-2 gap-1.5">
      {data.followupRouteCode === "AGR" ? (
        <>
          <KV label="Dificultades" value={selOf("work_difficulty")} wide />
          <KV label="Trato supervisor" value={label("treatment_rating", data.supervisorTreatmentRatingCode)} />
          <KV label="Trato compañeros" value={label("treatment_rating", data.coworkerTreatmentRatingCode)} />
          <KV label="Le gusta" value={selOf("work_like_most")} wide />
          <KV label="Permanencia" value={label("retention_intention", data.retentionIntentionCode)} />
          <KV label="Apoyo RRHH" value={label("hr_support_need", data.hrSupportNeedCode)} />
          <KV label="Hubo novedad" value={label("yes_no", data.hasInconvenienceCode)} />
          {data.inconvenienceActivityCode ? (
            <KV label="Actividad novedad" value={label("inconvenience_activity", data.inconvenienceActivityCode)} />
          ) : null}
        </>
      ) : null}
      {data.followupRouteCode === "ADM" ? (
        <>
          <KV label="Inducción suficiente" value={label("adaptation_response", data.inductionSufficientCode)} />
          <KV label="Bienvenida equipo" value={label("adaptation_response", data.teamWelcomeCode)} />
          <KV label="Ambiente laboral" value={label("satisfaction_level", data.workEnvironmentSatisfactionCode)} />
          <KV label="Claridad funciones" value={label("satisfaction_level", data.roleClaritySatisfactionCode)} />
          <KV label="Permanencia final" value={label("retention_intention", data.finalRetentionIntentionCode)} />
          <KV label="Aspecto a mejorar" value={label("work_aspect_to_improve", data.workAspectToImproveCode)} />
        </>
      ) : null}
      {data.actorId ? <KV label="Registrado por" value={data.actorId} wide /> : null}
    </div>
  );
}

export function FollowupHistorySection({ personId, currentUniqueFollowUpCode, catalogs }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data } = useSWR(
    open ? `/api/talento-humano/seguimientos/responses?personId=${encodeURIComponent(personId)}` : null,
    historyFetcher,
    { revalidateOnFocus: false, dedupingInterval: 30_000 },
  );

  const responses = (data?.responses ?? []).filter(
    (r) => r.uniqueFollowUpCode !== currentUniqueFollowUpCode,
  );

  return (
    <div className="rounded-[20px] border border-border/60 bg-muted/30">
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-[20px] px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/40"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <History className="size-4" />
          <span>Historial de seguimientos</span>
          {open && data ? (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold">
              {responses.length}
            </span>
          ) : null}
        </div>
        {open
          ? <ChevronUp className="size-4 text-muted-foreground" />
          : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>

      {open ? (
        <div className="border-t border-border/50 px-4 pb-4 pt-3">
          {!data ? (
            <p className="text-center text-xs text-muted-foreground">Cargando historial...</p>
          ) : responses.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Sin seguimientos previos registrados.</p>
          ) : (
            <div className="space-y-2">
              {responses.map((r) => {
                const isExpanded = expandedId === r.eventId;
                return (
                  <div key={r.eventId} className="rounded-[16px] border border-border/50 bg-card/60 px-3 py-2.5">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between"
                      onClick={() => setExpandedId(isExpanded ? null : r.eventId)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-foreground">
                          {formatDate(r.followUpDate.slice(0, 10))}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{r.followupRouteCode}</Badge>
                        {r.responseVersion > 1
                          ? <Badge variant="secondary" className="text-[10px]">v{r.responseVersion}</Badge>
                          : null}
                      </div>
                      {isExpanded
                        ? <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
                        : <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />}
                    </button>
                    {isExpanded ? (
                      <HistoryItemDetail eventId={r.eventId} catalogs={catalogs} />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
