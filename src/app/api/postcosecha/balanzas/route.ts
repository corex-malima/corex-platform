import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import {
  getBalanzasDashboardData,
  normalizeBalanzasFilters,
} from "@/lib/postcosecha-balanzas";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const filters = normalizeBalanzasFilters({
      metric: request.nextUrl.searchParams.get("metric") ?? undefined,
      year: request.nextUrl.searchParams.get("year") ?? undefined,
      month: request.nextUrl.searchParams.get("month") ?? undefined,
      dayName: request.nextUrl.searchParams.get("dayName") ?? undefined,
      destination: request.nextUrl.searchParams.get("destination") ?? undefined,
      weekMode: request.nextUrl.searchParams.get("weekMode") ?? undefined,
      weekValue: request.nextUrl.searchParams.get("weekValue") ?? undefined,
      dateFrom: request.nextUrl.searchParams.get("dateFrom") ?? undefined,
      dateTo: request.nextUrl.searchParams.get("dateTo") ?? undefined,
    });
    const data = await getBalanzasDashboardData(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el indicador de balanzas.");
  }
}

