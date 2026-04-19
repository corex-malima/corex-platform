import { type NextRequest, NextResponse } from "next/server";

import { apiJsonError, handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import { getRequestId } from "@/lib/request-id";
import {
  getDeadPlantsReseedLoadDetail,
  normalizeDeadPlantsReseedType,
} from "@/lib/dead-plants-reseed";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { runId } = await context.params;
    const type = normalizeDeadPlantsReseedType(request.nextUrl.searchParams.get("type"));
    const data = await getDeadPlantsReseedLoadDetail(type, decodeURIComponent(runId));

    if (!data) {
      return apiJsonError("No se encontro la carga solicitada.", 404, getRequestId(request));
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return apiJsonError(error.message, 400, getRequestId(request));
    }

    return handleApiError(error, "No se pudo cargar el detalle de la carga.");
  }
}
