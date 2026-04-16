import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireAuth } from "@/lib/api-auth";
import { getCycleMortalityCurveByCycleKey } from "@/lib/mortality";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cycleKey: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { cycleKey } = await context.params;
    const data = await getCycleMortalityCurveByCycleKey(decodeURIComponent(cycleKey));

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar la curva de mortandad del ciclo.");
  }
}

