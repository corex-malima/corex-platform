import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import type {
  PoscosechaClasificacionBootData,
  PoscosechaClasificacionRunInput,
  PoscosechaClasificacionRunPayload,
} from "@/lib/postcosecha-clasificacion-en-blanco-types";
import {
  getClasificacionEnBlancoBootData,
  runClasificacionEnBlancoSolver,
} from "@/lib/postcosecha-clasificacion-en-blanco";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await getClasificacionEnBlancoBootData();

    return NextResponse.json<PoscosechaClasificacionBootData>(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar la base de Clasificacion en blanco.");
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const payload = (await request.json()) as PoscosechaClasificacionRunInput;
    const data = await runClasificacionEnBlancoSolver(payload);

    return NextResponse.json<PoscosechaClasificacionRunPayload>(
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

    return handleApiError(error, "No se pudo ejecutar Clasificacion en blanco.");
  }
}
