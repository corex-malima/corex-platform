import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type { BodegaPresentationInput, BodegaPresentationPayload } from "@/lib/bodega-master-types";
import { updateBodegaPresentation } from "@/lib/bodega-masters";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ presentationId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { presentationId } = await context.params;
    const payload = (await request.json()) as BodegaPresentationInput;
    const actorId = (await getSession()) ?? "corex_bodega_ui";
    const data = await updateBodegaPresentation(decodeURIComponent(presentationId), payload, actorId);

    return NextResponse.json<BodegaPresentationPayload>(
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

    return handleApiError(error, "No se pudo actualizar la presentacion de Bodega.");
  }
}
