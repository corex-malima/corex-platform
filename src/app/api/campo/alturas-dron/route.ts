import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import {
  getAlturasDronData,
  normalizeAlturasDronFilters,
} from "@/lib/campo-alturas-dron";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const sp = request.nextUrl.searchParams;
    const filters = normalizeAlturasDronFilters({
      dateFrom: sp.get("dateFrom") ?? undefined,
      dateTo: sp.get("dateTo") ?? undefined,
      block: sp.get("block") ?? undefined,
      cycleKey: sp.get("cycleKey") ?? undefined,
      q: sp.get("q") ?? undefined,
    });

    const data = await getAlturasDronData(filters);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar los datos de alturas de dron.");
  }
}
