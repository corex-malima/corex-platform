import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getDeadPlantsReseedInitialData } from "@/lib/dead-plants-reseed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await getDeadPlantsReseedInitialData();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el modulo de plantas muertas y resiembras.");
  }
}
