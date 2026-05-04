import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import { bodegaCategoryInputSchema } from "@/lib/bodega-schemas";
import { formatZodIssue } from "@/lib/admin-masters-schemas";
import type { BodegaCategoryPayload } from "@/lib/bodega-master-types";
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
    const raw = await request.json().catch(() => null);
    const parsed = bodegaCategoryInputSchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(formatZodIssue(parsed.error.issues), 400);
    }
    const actorId = (await getSession()) ?? "corex_bodega_ui";
    const data = await updateBodegaCategory(decodeURIComponent(categoryId), parsed.data, actorId);

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
