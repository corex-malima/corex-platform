import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import {
  getCurvaCosechaDashboardData,
  normalizeCurvaCosechaFilters,
} from "@/lib/campo-curva-cosecha";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const filters = normalizeCurvaCosechaFilters({
      year: request.nextUrl.searchParams.get("year") ?? undefined,
      month: request.nextUrl.searchParams.get("month") ?? undefined,
      variety: request.nextUrl.searchParams.get("variety") ?? undefined,
      spType: request.nextUrl.searchParams.get("spType") ?? undefined,
      area: request.nextUrl.searchParams.get("area") ?? undefined,
    });

    const data = await getCurvaCosechaDashboardData(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar la curva de cosecha agregada.");
  }
}
