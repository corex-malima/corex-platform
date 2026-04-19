import { type NextRequest, NextResponse } from "next/server";

import { apiJsonError, handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import { getRequestId } from "@/lib/request-id";
import {
  listDeadPlantsReseedLoads,
  normalizeDeadPlantsReseedType,
} from "@/lib/dead-plants-reseed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const params = request.nextUrl.searchParams;
    const type = normalizeDeadPlantsReseedType(params.get("type"));
    const data = await listDeadPlantsReseedLoads({
      type,
      dateFrom: params.get("dateFrom"),
      dateTo: params.get("dateTo"),
      blockId: params.get("blockId"),
      limit: 50,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error) {
      return apiJsonError(error.message, 400, getRequestId(request));
    }

    return handleApiError(error, "No se pudieron cargar las cargas previas.");
  }
}
