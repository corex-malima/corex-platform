import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type { BodegaCategoryInput, BodegaCategoryPayload } from "@/lib/bodega-master-types";
import { updateBodegaCategory } from "@/lib/bodega-masters";

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
    const payload = (await request.json()) as BodegaCategoryInput;
    const actorId = (await getSession()) ?? "corex_bodega_ui";
    const data = await updateBodegaCategory(decodeURIComponent(categoryId), payload, actorId);

    return NextResponse.json<BodegaCategoryPayload>(
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

    return handleApiError(error, "No se pudo actualizar la categoria de Bodega.");
  }
}
