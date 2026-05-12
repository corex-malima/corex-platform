import { describe, expect, it } from "vitest";
import { createFollowupResponseSchema, updateFollowupResponseSchema } from "@/lib/talento-humano-seguimientos-schemas";
import { deriveFollowupRoute } from "@/lib/talento-humano-seguimientos-person";

const VALID_AGR_SELECTIONS = [
  { selectionGroupCode: "work_difficulty", catalogCode: "work_difficulty", itemCode: "none" },
  { selectionGroupCode: "work_like_most", catalogCode: "work_like_most", itemCode: "work_environment" },
  { selectionGroupCode: "improvement_opportunity", catalogCode: "improvement_opportunity", itemCode: "none" },
];

const BASE_AGR = {
  uniqueFollowUpCode: "FU-001",
  followUpCode: "AGR-001",
  personId: "P-001",
  followupRouteCode: "AGR" as const,
  followupRouteSource: "scheduled_followup" as const,
  scheduledFollowUpType: "T1",
  followUpDate: "2026-04-28",
  changeReason: "initial_load",
  coworkerTreatmentRatingCode: "good",
  supervisorTreatmentRatingCode: "good",
  areaManagerTreatmentRatingCode: "good",
  retentionIntentionCode: "more_than_1_year",
  hrSupportNeedCode: "none",
  familyPregnancyRelationCode: "none",
  hasInconvenienceCode: "no",
  inconvenienceDate: "2026-04-28",
  inconvenienceActivityCode: "harvest",
  inconvenienceTypeCode: "botrytis",
  selections: VALID_AGR_SELECTIONS,
};

const BASE_ADM = {
  uniqueFollowUpCode: "FU-002",
  followUpCode: "ADM-001",
  personId: "P-002",
  followupRouteCode: "ADM" as const,
  followupRouteSource: "scheduled_followup" as const,
  scheduledFollowUpType: "T1",
  followUpDate: "2026-04-28",
  changeReason: "initial_load",
  inductionSufficientCode: "yes",
  transportProblemCode: "no",
  teamWelcomeCode: "yes",
  roleClaritySatisfactionCode: "satisfied",
  workEnvironmentSatisfactionCode: "satisfied",
  equipmentSatisfactionCode: "satisfied",
  recentWorkSatisfactionCode: "satisfied",
  workAspectToImproveCode: "none",
  finalRetentionIntentionCode: "more_than_1_year",
  selections: [],
};

describe("createFollowupResponseSchema", () => {
  it("acepta payload AGR completo valido", () => {
    expect(createFollowupResponseSchema.safeParse(BASE_AGR).success).toBe(true);
  });

  it("acepta payload ADM completo valido", () => {
    expect(createFollowupResponseSchema.safeParse(BASE_ADM).success).toBe(true);
  });

  it("acepta campos opcionales sin valor", () => {
    expect(createFollowupResponseSchema.safeParse({ ...BASE_AGR, workDifficultyObservation: undefined }).success).toBe(true);
    expect(createFollowupResponseSchema.safeParse({ ...BASE_ADM, adaptationSuggestion: undefined }).success).toBe(true);
  });

  it("rechaza AGR sin fecha y actividad de inconveniente", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      inconvenienceDate: null,
      inconvenienceActivityCode: null,
      inconvenienceTypeCode: null,
    }).success).toBe(false);
  });

  it("acepta has_inconvenience=yes con campos obligatorios", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      hasInconvenienceCode: "yes",
      inconvenienceDate: "2026-04-28",
      inconvenienceActivityCode: "harvest",
      inconvenienceTypeCode: "botrytis",
    }).success).toBe(true);
  });

  it("rechaza selection other sin otherDetail", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      selections: [
        { selectionGroupCode: "work_difficulty", catalogCode: "work_difficulty", itemCode: "other", otherDetail: null },
        ...VALID_AGR_SELECTIONS.filter((selection) => selection.selectionGroupCode !== "work_difficulty"),
      ],
    }).success).toBe(false);
  });

  it("acepta selection other con otherDetail", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      selections: [
        { selectionGroupCode: "work_difficulty", catalogCode: "work_difficulty", itemCode: "other", otherDetail: "Detalle" },
        ...VALID_AGR_SELECTIONS.filter((selection) => selection.selectionGroupCode !== "work_difficulty"),
      ],
    }).success).toBe(true);
  });

  it("rechaza none mezclado con otras opciones en el mismo grupo", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      selections: [
        { selectionGroupCode: "work_difficulty", catalogCode: "work_difficulty", itemCode: "none" },
        { selectionGroupCode: "work_difficulty", catalogCode: "work_difficulty", itemCode: "missing_tools" },
        ...VALID_AGR_SELECTIONS.filter((selection) => selection.selectionGroupCode !== "work_difficulty"),
      ],
    }).success).toBe(false);
  });

  it("rechaza retentionIntention corta sin short_retention_reason", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      retentionIntentionCode: "less_than_3_months",
      selections: VALID_AGR_SELECTIONS,
    }).success).toBe(false);
  });

  it("acepta retentionIntention corta con short_retention_reason", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      retentionIntentionCode: "less_than_3_months",
      selections: [
        ...VALID_AGR_SELECTIONS,
        { selectionGroupCode: "short_retention_reason", catalogCode: "short_retention_reason", itemCode: "better_opportunities_elsewhere" },
      ],
    }).success).toBe(true);
  });

  it("rechaza conflictPersonId sin conflictSituationDetail", () => {
    expect(createFollowupResponseSchema.safeParse({
      ...BASE_AGR,
      conflictPersonId: "P-999",
      conflictSituationDetail: null,
    }).success).toBe(false);
  });
});

describe("updateFollowupResponseSchema", () => {
  it("acepta solo action update", () => {
    expect(updateFollowupResponseSchema.safeParse({ action: "update", changeReason: "data_entry_error" }).success).toBe(true);
  });

  it("acepta campos parciales de correccion sin exigir payload completo", () => {
    expect(updateFollowupResponseSchema.safeParse({
      action: "update",
      changeReason: "manual_update",
      inconvenienceActivityCode: "harvest",
      inconvenienceTypeCode: "botrytis",
      selections: [
        { selectionGroupCode: "work_difficulty", catalogCode: "work_difficulty", itemCode: "missing_tools" },
      ],
    }).success).toBe(true);
  });

  it("rechaza acciones distintas de update", () => {
    expect(updateFollowupResponseSchema.safeParse({ action: "delete", changeReason: "data_entry_error" }).success).toBe(false);
  });
});

describe("deriveFollowupRoute", () => {
  it("deriva AGR desde AGRICOLA (match exacto)", () => {
    expect(deriveFollowupRoute("AGRICOLA")).toBe("AGR");
    expect(deriveFollowupRoute("  agricola  ")).toBe("AGR");
  });

  it("deriva ADM desde ADMINISTRATIVO (match exacto)", () => {
    expect(deriveFollowupRoute("ADMINISTRATIVO")).toBe("ADM");
    expect(deriveFollowupRoute("administrativo")).toBe("ADM");
  });

  it("devuelve null para clasificaciones distintas (CHOFER, SERVICIOS PRESTADOS, etc.)", () => {
    expect(deriveFollowupRoute("CHOFER")).toBeNull();
    expect(deriveFollowupRoute("SERVICIOS PRESTADOS")).toBeNull();
    expect(deriveFollowupRoute("OTRO")).toBeNull();
  });

  it("devuelve null cuando no hay job_classification_code", () => {
    expect(deriveFollowupRoute(null)).toBeNull();
    expect(deriveFollowupRoute(undefined)).toBeNull();
    expect(deriveFollowupRoute("")).toBeNull();
  });
});
