import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type {
  PoscosechaSkuInput,
  PoscosechaSkuPayload,
} from "@/lib/postcosecha-sku-types";
import { updatePostharvestSku } from "@/lib/postcosecha-skus";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ skuId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { skuId } = await context.params;
    const payload = (await request.json()) as PoscosechaSkuInput;
    const actorId = (await getSession()) ?? "corex_postcosecha_ui";
    const data = await updatePostharvestSku(decodeURIComponent(skuId), payload, actorId);

    return NextResponse.json<PoscosechaSkuPayload>(
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

    return handleApiError(error, "No se pudo actualizar el SKU de postcosecha.");
  }
}
