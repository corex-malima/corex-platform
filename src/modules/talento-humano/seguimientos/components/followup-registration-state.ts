import { encodeMultiSelectValue } from "@/lib/multi-select";
import type { AgrFormState } from "@/modules/talento-humano/seguimientos/components/followup-form-agr";
import type { AdmFormState } from "@/modules/talento-humano/seguimientos/components/followup-form-adm";
import type { EmployeeFollowupCatalogOption, EmployeeFollowupResponseDetail } from "@/modules/talento-humano/seguimientos/server/types";

export function toOpts(items: EmployeeFollowupCatalogOption[] = []): string[] {
  return items.map((i) => i.itemCode);
}

export function buildDV(items: EmployeeFollowupCatalogOption[] = []) {
  const map = new Map(items.map((i) => [i.itemCode, i.itemLabelEs]));
  return (code: string) => map.get(code) ?? code;
}

export const CATALOG_LABELS: Record<string, string> = {
  treatment_rating: "Trato",
  yes_no: "Si / No",
  retention_intention: "Permanencia",
  hr_support_need: "Apoyo RRHH",
  family_pregnancy_relation: "Familiar / embarazo",
  inconvenience_activity: "Actividad de novedad",
  inconvenience_type: "Tipo de novedad",
  work_difficulty: "Dificultades",
  work_like_most: "Gustos del trabajo",
  improvement_opportunity: "Oportunidades",
  short_retention_reason: "Razon de salida corta",
  adaptation_response: "Adaptacion",
  satisfaction_level: "Satisfaccion",
  work_aspect_to_improve: "Aspectos a mejorar",
};

export const AGR_REQUIRED_CATALOGS = [
  "treatment_rating",
  "yes_no",
  "retention_intention",
  "hr_support_need",
  "family_pregnancy_relation",
  "inconvenience_activity",
  "inconvenience_type",
  "work_difficulty",
  "work_like_most",
  "improvement_opportunity",
  "short_retention_reason",
];

export const ADM_REQUIRED_CATALOGS = [
  "yes_no",
  "adaptation_response",
  "satisfaction_level",
  "retention_intention",
  "work_aspect_to_improve",
];

export const EMPTY_AGR: AgrFormState = {
  workDiffEncoded: "", workDiffOther: "", workDifficultyObs: "",
  coworkerRating: "", supervisorRating: "", areaManagerRating: "",
  conflictPersonId: "", conflictDetail: "",
  workLikeMostEncoded: "", workLikeMostOther: "", workLikeMostObs: "",
  improvOppEncoded: "", improvOppOther: "", improvementOppObs: "", agrSatisfactionObs: "",
  retentionIntention: "", retentionReasonObs: "", shortRetentionEncoded: "", shortRetentionOther: "",
  hrSupportNeed: "", hrSupportOther: "",
  familyPregnancyRelation: "", familyPregnancyObs: "",
  developedActivitiesDescription: "",
  hasInconvenience: "", inconvenienceDate: "",
  inconvenienceActivity: "", inconvenienceActivityOther: "",
  inconvenienceType: "", inconvenienceTypeOther: "",
};

export const EMPTY_ADM: AdmFormState = {
  inductionSufficient: "", transportProblem: "", teamWelcome: "",
  adaptationNegObs: "", adaptationSuggestion: "",
  roleClarity: "", workEnvironment: "", equipmentSatisfaction: "",
  probationSuggestion: "", recentWorkSatisfaction: "",
  workAspectToImprove: "", workAspectOther: "",
  dissatisfactionDetail: "", finalRetentionIntention: "", finalStaySuggestion: "",
};

export function hydrateAgrState(detail: EmployeeFollowupResponseDetail): AgrFormState {
  const groupValues = (groupCode: string) =>
    detail.selections.filter((selection) => selection.selectionGroupCode === groupCode).map((selection) => selection.itemCode);
  const groupOther = (groupCode: string) =>
    detail.selections.find((selection) => selection.selectionGroupCode === groupCode && selection.itemCode === "other")?.otherDetail ?? "";

  return {
    workDiffEncoded: encodeMultiSelectValue(groupValues("work_difficulty")),
    workDiffOther: groupOther("work_difficulty"),
    workDifficultyObs: detail.workDifficultyObservation ?? "",
    coworkerRating: detail.coworkerTreatmentRatingCode ?? "",
    supervisorRating: detail.supervisorTreatmentRatingCode ?? "",
    areaManagerRating: detail.areaManagerTreatmentRatingCode ?? "",
    conflictPersonId: detail.conflictPersonId ?? "",
    conflictDetail: detail.conflictSituationDetail ?? "",
    workLikeMostEncoded: encodeMultiSelectValue(groupValues("work_like_most")),
    workLikeMostOther: groupOther("work_like_most"),
    workLikeMostObs: detail.workLikeMostObservation ?? "",
    improvOppEncoded: encodeMultiSelectValue(groupValues("improvement_opportunity")),
    improvOppOther: groupOther("improvement_opportunity"),
    improvementOppObs: detail.improvementOpportunityObservation ?? "",
    agrSatisfactionObs: detail.agrSatisfactionObservation ?? "",
    retentionIntention: detail.retentionIntentionCode ?? "",
    retentionReasonObs: detail.retentionReasonObservation ?? "",
    shortRetentionEncoded: encodeMultiSelectValue(groupValues("short_retention_reason")),
    shortRetentionOther: groupOther("short_retention_reason"),
    hrSupportNeed: detail.hrSupportNeedCode ?? "",
    hrSupportOther: detail.hrSupportNeedOtherDetail ?? "",
    familyPregnancyRelation: detail.familyPregnancyRelationCode ?? "",
    familyPregnancyObs: detail.familyPregnancyObservation ?? "",
    developedActivitiesDescription: detail.developedActivitiesDescription ?? "",
    hasInconvenience: detail.hasInconvenienceCode ?? "",
    inconvenienceDate: detail.inconvenienceDate ?? "",
    inconvenienceActivity: detail.inconvenienceActivityCode ?? "",
    inconvenienceActivityOther: detail.inconvenienceActivityOtherDetail ?? "",
    inconvenienceType: detail.inconvenienceTypeCode ?? "",
    inconvenienceTypeOther: detail.inconvenienceTypeOtherDetail ?? "",
  };
}

export function hydrateAdmState(detail: EmployeeFollowupResponseDetail): AdmFormState {
  return {
    inductionSufficient: detail.inductionSufficientCode ?? "",
    transportProblem: detail.transportProblemCode ?? "",
    teamWelcome: detail.teamWelcomeCode ?? "",
    adaptationNegObs: detail.adaptationNegativeObservation ?? "",
    adaptationSuggestion: detail.adaptationSuggestion ?? "",
    roleClarity: detail.roleClaritySatisfactionCode ?? "",
    workEnvironment: detail.workEnvironmentSatisfactionCode ?? "",
    equipmentSatisfaction: detail.equipmentSatisfactionCode ?? "",
    probationSuggestion: detail.probationSatisfactionSuggestion ?? "",
    recentWorkSatisfaction: detail.recentWorkSatisfactionCode ?? "",
    workAspectToImprove: detail.workAspectToImproveCode ?? "",
    workAspectOther: detail.workAspectToImproveOtherDetail ?? "",
    dissatisfactionDetail: detail.dissatisfactionDetail ?? "",
    finalRetentionIntention: detail.finalRetentionIntentionCode ?? "",
    finalStaySuggestion: detail.finalStaySuggestion ?? "",
  };
}
