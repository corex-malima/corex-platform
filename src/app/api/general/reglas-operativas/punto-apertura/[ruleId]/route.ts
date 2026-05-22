import { type NextRequest, NextResponse } from "next/server";

import { formatZodIssue } from "@/lib/admin-masters-schemas";
import { handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import { getSession } from "@/lib/auth";
import { updateGeneralOpeningTargetRule } from "@/lib/general-opening-target-rules";
import { generalOpeningTargetRuleInputSchema } from "@/lib/general-opening-target-rules-schemas";

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ message, error: message }, { status, headers });
}

async function readActorId(fallbackActorId: string) {
  return (await getSession()) ?? fallbackActorId;
}

type RouteContext = {
  params: Promise<{ ruleId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { ruleId } = await context.params;
    const raw = await request.json().catch(() => null);
    const parsed = generalOpeningTargetRuleInputSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(formatZodIssue(parsed.error.issues), 400);
    }

    const actorId = await readActorId("corex_general_opening_target_rules_ui");
    const data = await updateGeneralOpeningTargetRule(decodeURIComponent(ruleId), parsed.data, actorId);

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }
    return handleApiError(error, "No se pudo actualizar la regla de punto de apertura.");
  }
}
