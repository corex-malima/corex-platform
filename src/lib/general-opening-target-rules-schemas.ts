import { z } from "zod";

const TrimmedOptional = z.string().trim().max(500).nullable().optional();

export const generalOpeningTargetRuleInputSchema = z.object({
  code: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  validFrom: z.string().trim().min(1).max(32),
  openingPointCategoryId: z.string().trim().min(1).max(160),
  varietyId: z.string().trim().max(160).nullable().optional(),
  notes: TrimmedOptional,
  isActive: z.boolean(),
  changeReason: z.string().trim().max(200).nullable().optional(),
});

export type GeneralOpeningTargetRuleInputSchema = z.infer<typeof generalOpeningTargetRuleInputSchema>;
