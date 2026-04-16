import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import { normalizeComparisonFilters, searchComparisonCycles } from "@/lib/comparacion";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const filters = normalizeComparisonFilters({
      q: request.nextUrl.searchParams.get("q") ?? undefined,
      area: request.nextUrl.searchParams.get("area") ?? undefined,
      block: request.nextUrl.searchParams.get("block") ?? undefined,
      variety: request.nextUrl.searchParams.get("variety") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });
    const data = await searchComparisonCycles(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar la busqueda de ciclos.");
  }
}

