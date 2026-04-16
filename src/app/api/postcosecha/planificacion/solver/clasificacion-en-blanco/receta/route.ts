import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import type {
  PoscosechaClasificacionRecipeInput,
  PoscosechaClasificacionRecipePayload,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import { runClasificacionEnBlancoRecipeSolver } from "@/lib/postcosecha-clasificacion-en-blanco";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const payload = (await request.json()) as PoscosechaClasificacionRecipeInput;
    const data = await runClasificacionEnBlancoRecipeSolver(payload);

    return NextResponse.json<PoscosechaClasificacionRecipePayload>(
      { data },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }

    return handleApiError(error, "No se pudo construir la receta del SKU.");
  }
}
