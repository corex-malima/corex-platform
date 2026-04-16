import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getActivosPersonas, normalizeTalentoSnapshotFilters } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const filters = normalizeTalentoSnapshotFilters({
      snapshotDate: searchParams.get("snapshotDate") ?? undefined,
      weekFrom: searchParams.get("weekFrom") ?? undefined,
      weekTo: searchParams.get("weekTo") ?? undefined,
      areaGeneral: searchParams.get("areaGeneral") ?? undefined,
      area: searchParams.get("area") ?? undefined,
      gender: searchParams.get("gender") ?? undefined,
      maritalStatus: searchParams.get("maritalStatus") ?? undefined,
      city: searchParams.get("city") ?? undefined,
      jobTitle: searchParams.get("jobTitle") ?? undefined,
      employerName: searchParams.get("employerName") ?? undefined,
      jobClassification: searchParams.get("jobClassification") ?? undefined,
      associatedWorker: searchParams.get("associatedWorker") ?? undefined,
    });

    const data = await getActivosPersonas(filters);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar los datos de composicion laboral.");
  }
}

