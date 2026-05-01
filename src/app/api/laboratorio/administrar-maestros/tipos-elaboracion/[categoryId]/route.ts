import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type { LaboratoryCategoryInput, LaboratoryCategoryPayload } from "@/lib/laboratory-master-types";
import { updateLaboratoryCategory } from "@/lib/laboratory-masters";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ categoryId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { categoryId } = await context.params;
    const payload = (await request.json()) as LaboratoryCategoryInput;
    const actorId = (await getSession()) ?? "corex_laboratory_ui";
    const data = await updateLaboratoryCategory(decodeURIComponent(categoryId), payload, actorId);

    return NextResponse.json<LaboratoryCategoryPayload>(
      { data: data! },
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

    return handleApiError(error, "No se pudo actualizar el tipo de Laboratorio.");
  }
}
