import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type { BodegaUnitInput, BodegaUnitPayload } from "@/lib/bodega-master-types";
import { updateBodegaUnit } from "@/lib/bodega-masters";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ unitId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { unitId } = await context.params;
    const payload = (await request.json()) as BodegaUnitInput;
    const actorId = (await getSession()) ?? "corex_bodega_ui";
    const data = await updateBodegaUnit(decodeURIComponent(unitId), payload, actorId);

    return NextResponse.json<BodegaUnitPayload>(
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

    return handleApiError(error, "No se pudo actualizar la unidad de Bodega.");
  }
}
