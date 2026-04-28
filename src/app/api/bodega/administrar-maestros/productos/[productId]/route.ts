import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type { BodegaProductInput, BodegaProductPayload } from "@/lib/bodega-master-types";
import { updateBodegaProduct } from "@/lib/bodega-masters";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { productId } = await context.params;
    const payload = (await request.json()) as BodegaProductInput;
    const actorId = (await getSession()) ?? "corex_bodega_ui";
    const data = await updateBodegaProduct(decodeURIComponent(productId), payload, actorId);

    return NextResponse.json<BodegaProductPayload>(
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

    return handleApiError(error, "No se pudo actualizar el producto de Bodega.");
  }
}
