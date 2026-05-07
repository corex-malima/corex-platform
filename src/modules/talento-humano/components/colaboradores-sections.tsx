"use client";

import type { ReactNode } from "react";
import { BriefcaseBusiness, CalendarClock, HeartPulse, MapPin, UserRound } from "lucide-react";
import useSWRImmutable from "swr/immutable";

import { fetchJson } from "@/lib/fetch-json";
import type { CollaboratorDetailPayload } from "@/lib/talento-humano-colaboradores";
import {
  AbsenteeismSection,
  PerformanceSection,
  PerformanceTrendCard,
} from "@/modules/talento-humano/components/colaboradores-analytics-sections";
import { EmptyState } from "@/shared/data-display/empty-state";
import { InfoField } from "@/shared/data-display/info-field";
import { MetricTile } from "@/shared/data-display/metric-tile";
import { KpiGrid } from "@/shared/layout/filter-panel";
import { formatDate, formatFlexibleNumber, formatInteger, formatPercent } from "@/shared/lib/format";
import { ScrollFadeTable } from "@/shared/tables/scroll-fade-table";
import { StandardTable, StandardTd, StandardTh } from "@/shared/tables/standard-table";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export type CollaboratorTabKey =
  | "basic"
  | "performance"
  | "medical"
  | "absenteeism"
  | "exits"
  | "followups";

type MedicalPayload = {
  summary: {
    examsCount: number;
    lastExamDate: string | null;
    lastExamType: string | null;
    availableMarkerCount: number;
    alertExamCount: number;
  };
  exams: Array<{
    examId: number;
    date: string;
    type: string;
    alertsCount: number;
    markers: Array<{
      field: string;
      name: string;
      value: number | null;
      unit: string;
      status: string;
      range: string;
    }>;
  }>;
};

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function dateVal(value: string | null | undefined) {
  return value ? formatDate(value) : "—";
}

function pct(value: number | null | undefined) {
  return value == null
    ? "—"
    : formatPercent(value, { input: "ratio", minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function boolVal(value: boolean | null | undefined) {
  if (value == null) return "—";
  return value ? "Sí" : "No";
}

export function HeaderCard({ detail }: { detail: CollaboratorDetailPayload }) {
  const profile = detail.profile;

  return (
    <Card className="starter-panel border-border/70 bg-card/84">
      <CardContent className="p-5">
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
          <div className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-slate-900 to-emerald-600 text-2xl font-semibold text-white">
            {initials(profile.personName)}
          </div>
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight">{profile.personName}</h2>
                <p className="text-sm text-muted-foreground">
                  ID {profile.personId} · {profile.nationalId ?? "sin cédula"}
                </p>
              </div>
              <Badge variant={profile.isActive ? "success" : "danger"}>
                {profile.isActive ? "Activo" : "Pasivo"}
              </Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <InfoField label="Cargo" value={profile.jobTitle} />
              <InfoField label="Área actual" value={profile.areaName ?? profile.areaId} />
              <InfoField label="Clasificación" value={profile.jobClassificationCode} />
              <InfoField label="T. social" value={profile.associatedWorkerName} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TabContent({
  tab,
  detail,
}: {
  tab: CollaboratorTabKey;
  detail: CollaboratorDetailPayload;
}) {
  if (tab === "basic") return <BasicSection detail={detail} />;
  if (tab === "performance")
    return detail.performance ? (
      <PerformanceSection data={detail.performance} />
    ) : (
      <EmptyState label="Sin permiso o sin datos de rendimiento." />
    );
  if (tab === "medical") return <MedicalSection personId={detail.profile.personId} />;
  if (tab === "absenteeism")
    return detail.absenteeism ? (
      <AbsenteeismSection data={detail.absenteeism} />
    ) : (
      <EmptyState label="Sin permiso o sin datos de ausentismo." />
    );
  if (tab === "exits")
    return detail.exits ? (
      <ExitsSection rows={detail.exits} />
    ) : (
      <EmptyState label="Sin permiso o sin datos de salidas." />
    );
  if (tab === "followups")
    return detail.followups ? (
      <FollowupsSection rows={detail.followups} />
    ) : (
      <EmptyState label="Sin permiso o sin seguimientos." />
    );
  return null;
}

function BasicSection({ detail }: { detail: CollaboratorDetailPayload }) {
  const p = detail.profile;
  const areaHistory = detail.areaEvents.filter((event) => event.eventType === "CA");
  const entryHistory = detail.areaEvents.filter((event) => event.eventType === "IS");
  const metrics = detail.absenteeism?.metrics ?? null;

  return (
    <div className="space-y-4">
      <KpiGrid className="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        <MetricTile
          label="Ingresos"
          value={formatInteger(p.entryCount)}
          hint={`Último: ${dateVal(p.lastEntryDate)}`}
        />
        <MetricTile
          label="Rendimiento"
          value={pct(detail.performance?.totals.rendimiento)}
          hint="ponderado visible"
        />
        <MetricTile
          label="% H. Normales"
          value={pct(metrics?.pctActualHoursHn)}
          hint="presencia sin rendimiento medible"
        />
        <MetricTile
          label="% H. Rendimiento"
          value={pct(metrics?.pctActualHoursRend)}
          hint="actividades dif. H normales"
        />
        <MetricTile
          label="% Ausentismo"
          value={pct(metrics?.pctAbsTotal)}
          hint="faltas, atrasos y permisos"
        />
      </KpiGrid>
      <div className="grid gap-4 xl:grid-cols-3">
        <InfoCard title="Datos personales" icon={<UserRound className="size-4" aria-hidden="true" />}>
          <InfoField label="Género" value={p.gender} />
          <InfoField label="Estado civil" value={p.maritalStatus} />
          <InfoField label="Nacimiento" value={dateVal(p.birthDate)} />
          <InfoField label="Lugar nacimiento" value={p.birthPlace} />
          <InfoField label="Nacionalidad" value={p.nationality} />
          <InfoField label="Educación" value={p.educationTitle} />
          <InfoField label="Hijos" value={p.childrenCount == null ? "—" : formatInteger(p.childrenCount)} />
          <InfoField
            label="Dependientes"
            value={p.dependentsCount == null ? "—" : formatInteger(p.dependentsCount)}
          />
          <InfoField label="Discapacidad" value={boolVal(p.disabledFlag)} />
        </InfoCard>
        <InfoCard title="Datos laborales" icon={<BriefcaseBusiness className="size-4" aria-hidden="true" />}>
          <InfoField label="Empresa" value={p.employerName} />
          <InfoField label="Tipo empleado" value={p.employeeType} />
          <InfoField label="Contrato" value={p.contractType} />
          <InfoField label="Clasificación" value={p.jobClassificationCode} />
          <InfoField label="Código finca" value={p.farmCode} />
          <InfoField label="T. social" value={p.associatedWorkerName} />
          <InfoField label="Pago rendimiento" value={boolVal(p.performancePayApplicable)} />
          <InfoField label="Última entrada" value={dateVal(p.lastEntryDate)} />
          <InfoField label="Última salida" value={dateVal(p.lastExitDate)} />
        </InfoCard>
        <InfoCard title="Contacto" icon={<MapPin className="size-4" aria-hidden="true" />}>
          <InfoField label="Email" value={p.email} className="sm:col-span-2" />
          <InfoField label="Teléfono" value={p.phoneNumber} />
          <InfoField label="Ciudad" value={p.city} />
          <InfoField label="Parroquia" value={p.parish} />
          <InfoField label="Dirección" value={p.address} className="sm:col-span-2" />
        </InfoCard>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <HistoryCard title="Historial de área" headers={["Área", "Desde", "Hasta", "Actual"]}>
          {areaHistory.slice(0, 12).map((event, index) => (
            <tr key={`${event.validFrom}-${index}`} className="border-t border-border/40">
              <StandardTd>{event.areaName ?? event.areaId ?? "—"}</StandardTd>
              <StandardTd>{dateVal(event.validFrom)}</StandardTd>
              <StandardTd>{dateVal(event.validTo)}</StandardTd>
              <StandardTd>
                {event.isCurrent ? (
                  <Badge variant="success">Actual</Badge>
                ) : (
                  <Badge variant="outline">Anterior</Badge>
                )}
              </StandardTd>
            </tr>
          ))}
        </HistoryCard>
        <HistoryCard title="Ingresos y salidas" headers={["Desde", "Hasta", "Actual"]}>
          {entryHistory.slice(0, 12).map((event, index) => (
            <tr key={`${event.validFrom}-${index}`} className="border-t border-border/40">
              <StandardTd>{dateVal(event.validFrom)}</StandardTd>
              <StandardTd>{dateVal(event.validTo)}</StandardTd>
              <StandardTd>
                {event.isCurrent ? (
                  <Badge variant="success">Vigente</Badge>
                ) : (
                  <Badge variant="outline">Cerrado</Badge>
                )}
              </StandardTd>
            </tr>
          ))}
        </HistoryCard>
      </div>
      {detail.performance ? <PerformanceTrendCard data={detail.performance} /> : null}
    </div>
  );
}

function MedicalSection({ personId }: { personId: string }) {
  const { data, error, isLoading } = useSWRImmutable(
    `/api/medical/person/${encodeURIComponent(personId)}`,
    (url) => fetchJson<MedicalPayload>(url, "No se pudo cargar la ficha médica."),
  );
  const latest = data?.exams[0] ?? null;
  if (isLoading) return <EmptyState label="Cargando ficha médica." />;
  if (error) return <EmptyState label="No se pudo cargar la ficha médica." />;

  return (
    <div className="space-y-4">
      <KpiGrid className="grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">
        <MetricTile
          label="Exámenes"
          value={formatInteger(data?.summary.examsCount ?? 0)}
          hint={`Último: ${dateVal(data?.summary.lastExamDate)}`}
        />
        <MetricTile label="Tipo último" value={data?.summary.lastExamType ?? "—"} />
        <MetricTile
          label="Marcadores"
          value={formatInteger(data?.summary.availableMarkerCount ?? 0)}
        />
        <MetricTile
          label="Alertas"
          value={formatInteger(data?.summary.alertExamCount ?? 0)}
        />
      </KpiGrid>
      <Card className="border-border/70 bg-card/84">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="size-4" aria-hidden="true" />
            Últimos marcadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latest ? (
            <EmptyState label="Sin exámenes médicos registrados." />
          ) : (
            <ScrollFadeTable className="bg-background/70" innerClassName="rounded-[16px]">
              <StandardTable className="min-w-[640px]">
                <thead>
                  <tr>
                    <StandardTh>Marcador</StandardTh>
                    <StandardTh align="right">Valor</StandardTh>
                    <StandardTh>Unidad</StandardTh>
                    <StandardTh>Estado</StandardTh>
                    <StandardTh>Rango</StandardTh>
                  </tr>
                </thead>
                <tbody>
                  {latest.markers.slice(0, 12).map((marker) => (
                    <tr key={marker.field} className="border-t border-border/40">
                      <StandardTd>{marker.name}</StandardTd>
                      <StandardTd align="right" className="font-semibold">
                        {marker.value == null ? "—" : formatFlexibleNumber(marker.value)}
                      </StandardTd>
                      <StandardTd>{marker.unit}</StandardTd>
                      <StandardTd>{marker.status}</StandardTd>
                      <StandardTd>{marker.range}</StandardTd>
                    </tr>
                  ))}
                </tbody>
              </StandardTable>
            </ScrollFadeTable>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ExitsSection({ rows }: { rows: NonNullable<CollaboratorDetailPayload["exits"]> }) {
  return (
    <Card className="border-border/70 bg-card/84">
      <CardHeader>
        <CardTitle className="text-base">Historial de salidas</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollFadeTable
          className="bg-background/70"
          innerClassName="rounded-[16px]"
          topScrollbar
        >
          <StandardTable className="min-w-[1180px]">
            <thead>
              <tr>
                <StandardTh>Ingreso</StandardTh>
                <StandardTh>Salida</StandardTh>
                <StandardTh align="right">Meses</StandardTh>
                <StandardTh>Motivo</StandardTh>
                <StandardTh>Categoría</StandardTh>
                <StandardTh align="right">Cumpl.</StandardTh>
                <StandardTh>Observaciones</StandardTh>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.exitDate}-${index}`}
                  className="border-t border-border/40 align-top"
                >
                  <StandardTd>{dateVal(row.entryDate)}</StandardTd>
                  <StandardTd>{dateVal(row.exitDate)}</StandardTd>
                  <StandardTd align="right">
                    {row.activeMonths == null ? "—" : formatFlexibleNumber(row.activeMonths)}
                  </StandardTd>
                  <StandardTd>{row.exitReason ?? "—"}</StandardTd>
                  <StandardTd>{row.resignationCategory ?? "—"}</StandardTd>
                  <StandardTd align="right" className="font-semibold">
                    {pct(row.cumplimiento)}
                  </StandardTd>
                  <StandardTd className="max-w-[420px] whitespace-normal break-words leading-relaxed">
                    {row.observations ?? "—"}
                  </StandardTd>
                </tr>
              ))}
            </tbody>
          </StandardTable>
        </ScrollFadeTable>
      </CardContent>
    </Card>
  );
}

function FollowupsSection({
  rows,
}: {
  rows: NonNullable<CollaboratorDetailPayload["followups"]>;
}) {
  return (
    <div className="space-y-3">
      {rows.length === 0 ? <EmptyState label="Sin seguimientos registrados." /> : null}
      {rows.map((followup) => (
        <Card key={followup.eventId} className="border-border/70 bg-card/84">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{dateVal(followup.followUpDate)}</Badge>
              <Badge variant="secondary">{followup.followupRouteCode}</Badge>
              <Badge variant="outline">v{followup.responseVersion}</Badge>
            </div>
            <CardTitle className="text-base">Seguimiento {followup.followUpCode}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {followup.sections.map((section) => (
              <div
                key={section.title}
                className="rounded-[18px] border border-border/60 bg-background/70 p-3"
              >
                <p className="text-sm font-semibold">{section.title}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <InfoField
                      key={`${section.title}-${item.label}`}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function InfoCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/84">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function HistoryCard({
  title,
  headers,
  children,
}: {
  title: string;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 bg-card/84">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="size-4" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollFadeTable className="bg-background/70" innerClassName="rounded-[16px]">
          <StandardTable className="min-w-[520px]">
            <thead>
              <tr>
                {headers.map((header) => (
                  <StandardTh key={header}>{header}</StandardTh>
                ))}
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </StandardTable>
        </ScrollFadeTable>
      </CardContent>
    </Card>
  );
}
