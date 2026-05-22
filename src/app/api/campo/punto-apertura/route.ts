import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import {
  getCampoPuntoAperturaKpiData,
  normalizeCampoPuntoAperturaKpiFilters,
} from "@/lib/campo-punto-apertura-kpi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const filters = normalizeCampoPuntoAperturaKpiFilters({
      granularity: request.nextUrl.searchParams.get("granularity") as "day" | "week" | "month" | null ?? undefined,
      isoWeek: request.nextUrl.searchParams.get("isoWeek") ?? undefined,
      area: request.nextUrl.searchParams.get("area") ?? undefined,
      spType: request.nextUrl.searchParams.get("spType") ?? undefined,
      variety: request.nextUrl.searchParams.get("variety") ?? undefined,
      month: request.nextUrl.searchParams.get("month") ?? undefined,
      year: request.nextUrl.searchParams.get("year") ?? undefined,
      date: request.nextUrl.searchParams.get("date") ?? undefined,
      dominantClass: request.nextUrl.searchParams.get("dominantClass") ?? undefined,
      bloque: request.nextUrl.searchParams.get("bloque") ?? undefined,
    });

    const data = await getCampoPuntoAperturaKpiData(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el KPI de punto de apertura.");
  }
}
