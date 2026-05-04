import { formatDate } from "@/shared/lib/format";
import type {
  EmployeeFollowupCatalogMap,
  EmployeeFollowupCatalogOption,
  EmployeeFollowupResponseDetail,
} from "@/modules/talento-humano/seguimientos/server/types";

export type HistoryAnswer = {
  label: string;
  value: string | null | undefined;
  wide?: boolean;
  text?: boolean;
  personLookup?: boolean;
  personLookupAsOfDate?: string | null;
};

export type HistoryGroup = {
  key: string;
  title: string;
  description: string;
  answers: HistoryAnswer[];
};

export function cleanValue(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized && normalized !== "null" ? normalized : null;
}

function buildLookup(catalogs: EmployeeFollowupCatalogMap) {
  const map = new Map<string, string>();
  for (const [code, items] of Object.entries(catalogs)) {
    for (const item of items as EmployeeFollowupCatalogOption[]) {
      map.set(`${code}::${item.itemCode}`, item.itemLabelEs);
    }
  }
  return map;
}

function hasGroupData(group: HistoryGroup) {
  return group.answers.some((answer) => cleanValue(answer.value));
}

export function buildHistoryGroups(
  data: EmployeeFollowupResponseDetail,
  catalogs: EmployeeFollowupCatalogMap,
) {
  const lookup = buildLookup(catalogs);
  const label = (catalogCode: string, itemCode: string | null | undefined) =>
    itemCode ? (lookup.get(`${catalogCode}::${itemCode}`) ?? itemCode) : null;

  const selectionOf = (groupCode: string) =>
    data.selections.reduce<string[]>((acc, selection) => {
      if (selection.selectionGroupCode === groupCode) {
        const base = label(selection.catalogCode, selection.itemCode) ?? selection.itemCode;
        acc.push(selection.otherDetail ? `${base}: ${selection.otherDetail}` : base);
      }
      return acc;
    }, []).join(", ") || null;

  const dateLabel = (value: string | null | undefined) =>
    value ? formatDate(value.slice(0, 10)) : null;

  const auditAnswers: HistoryAnswer[] = [
    { label: "Registrado por", value: data.actorId },
    {
      label: "Motivo de cambio",
      value: label("employee_followup_change_reason", data.changeReason) ?? data.changeReason,
    },
    { label: "Version", value: data.responseVersion > 1 ? `v${data.responseVersion}` : null },
  ];

  const routeGroups: HistoryGroup[] =
    data.followupRouteCode === "AGR"
      ? [
          {
            key: "work_difficulty",
            title: "Dificultades laborales",
            description: "Situaciones que afectaron el desempeno en el trabajo.",
            answers: [
              { label: "Dificultades que afectan el desempeno", value: selectionOf("work_difficulty"), wide: true },
              { label: "Observaciones", value: data.workDifficultyObservation, text: true },
            ],
          },
          {
            key: "labor_relations",
            title: "Relaciones laborales",
            description: "Trato recibido e inconvenientes con otras personas.",
            answers: [
              { label: "Trato con companeros", value: label("treatment_rating", data.coworkerTreatmentRatingCode) },
              { label: "Trato con supervisor", value: label("treatment_rating", data.supervisorTreatmentRatingCode) },
              { label: "Trato con jefe de area", value: label("treatment_rating", data.areaManagerTreatmentRatingCode) },
              {
                label: "Persona en conflicto",
                value: data.conflictPersonId,
                personLookup: true,
                personLookupAsOfDate: data.followUpDate,
              },
              { label: "Situacion presentada", value: data.conflictSituationDetail, text: true },
            ],
          },
          {
            key: "satisfaction",
            title: "Satisfaccion y mejoras",
            description: "Lo que valora del trabajo y oportunidades de mejora.",
            answers: [
              { label: "Lo que mas le gusta", value: selectionOf("work_like_most"), wide: true },
              { label: "Detalle de lo que mas le gusta", value: data.workLikeMostObservation, text: true },
              { label: "Oportunidades de mejora", value: selectionOf("improvement_opportunity"), wide: true },
              { label: "Observacion de mejora", value: data.improvementOpportunityObservation, text: true },
              { label: "Observacion de satisfaccion", value: data.agrSatisfactionObservation, text: true },
            ],
          },
          {
            key: "retention",
            title: "Permanencia",
            description: "Intencion de permanencia y motivos asociados.",
            answers: [
              {
                label: "Tiempo que le gustaria seguir trabajando",
                value: label("retention_intention", data.retentionIntentionCode),
              },
              { label: "Razones de permanencia corta", value: selectionOf("short_retention_reason"), wide: true },
              { label: "Observaciones de permanencia", value: data.retentionReasonObservation, text: true },
            ],
          },
          {
            key: "human_talent",
            title: "Talento Humano",
            description: "Apoyos requeridos y novedades familiares.",
            answers: [
              { label: "Apoyo requerido de Talento Humano", value: label("hr_support_need", data.hrSupportNeedCode) },
              { label: "Detalle de apoyo requerido", value: data.hrSupportNeedOtherDetail, text: true },
              { label: "Familiar embarazada", value: label("family_pregnancy", data.familyPregnancyRelationCode) },
              { label: "Observacion familiar", value: data.familyPregnancyObservation, text: true },
            ],
          },
          {
            key: "activities",
            title: "Actividades e inconvenientes",
            description: "Actividades realizadas y detalle de novedades operativas.",
            answers: [
              { label: "Actividades desarrolladas", value: data.developedActivitiesDescription, text: true },
              { label: "Hubo inconveniente", value: label("yes_no", data.hasInconvenienceCode) },
              { label: "Fecha del inconveniente", value: dateLabel(data.inconvenienceDate) },
              {
                label: "Actividad con inconveniente",
                value: label("inconvenience_activity", data.inconvenienceActivityCode),
              },
              { label: "Otra actividad", value: data.inconvenienceActivityOtherDetail, text: true },
              { label: "Inconveniente presentado", value: label("inconvenience_type", data.inconvenienceTypeCode) },
              { label: "Otro inconveniente", value: data.inconvenienceTypeOtherDetail, text: true },
            ],
          },
        ]
      : [
          {
            key: "initial_adaptation",
            title: "Adaptacion inicial",
            description: "Induccion, transporte, bienvenida y sugerencias iniciales.",
            answers: [
              { label: "La induccion fue suficiente", value: label("adaptation_response", data.inductionSufficientCode) },
              { label: "Problemas para llegar al trabajo", value: label("adaptation_response", data.transportProblemCode) },
              { label: "Se sintio bien recibido por el equipo", value: label("adaptation_response", data.teamWelcomeCode) },
              { label: "Observaciones cuando la respuesta fue no", value: data.adaptationNegativeObservation, text: true },
              { label: "Sugerencia o requerimiento", value: data.adaptationSuggestion, text: true },
            ],
          },
          {
            key: "probation",
            title: "Periodo de prueba",
            description: "Satisfaccion con funciones, ambiente e implementos.",
            answers: [
              { label: "Claridad en funciones", value: label("satisfaction_level", data.roleClaritySatisfactionCode) },
              { label: "Ambiente de trabajo", value: label("satisfaction_level", data.workEnvironmentSatisfactionCode) },
              { label: "Equipos e implementos", value: label("satisfaction_level", data.equipmentSatisfactionCode) },
              { label: "Sugerencia o requerimiento", value: data.probationSatisfactionSuggestion, text: true },
            ],
          },
          {
            key: "bimonthly",
            title: "Seguimiento bimensual",
            description: "Satisfaccion reciente, aspectos de mejora y permanencia.",
            answers: [
              {
                label: "Satisfaccion con el trabajo en los ultimos meses",
                value: label("recent_work_satisfaction", data.recentWorkSatisfactionCode),
              },
              { label: "Aspecto que le gustaria mejorar", value: label("work_aspect_to_improve", data.workAspectToImproveCode) },
              { label: "Otro aspecto a mejorar", value: data.workAspectToImproveOtherDetail, text: true },
              { label: "Detalle del disgusto", value: data.dissatisfactionDetail, text: true },
              {
                label: "Tiempo que le gustaria seguir trabajando",
                value: label("retention_intention", data.finalRetentionIntentionCode),
              },
              { label: "Sugerencia final", value: data.finalStaySuggestion, text: true },
            ],
          },
        ];

  return [
    ...routeGroups,
    {
      key: "audit",
      title: "Auditoria",
      description: "Trazabilidad del registro seleccionado.",
      answers: auditAnswers,
    },
  ].filter(hasGroupData);
}
