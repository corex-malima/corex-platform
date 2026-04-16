import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getPersonProfile } from "@/lib/talento-humano";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ personId: string }> };

function jsonError(message: string, status: number) {
  return NextResponse.json({ message, error: message }, { status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { personId } = await context.params;
    if (!personId) {
      return jsonError("personId requerido.", 400);
    }

    const profile = await getPersonProfile(decodeURIComponent(personId));
    if (!profile) {
      return jsonError("Persona no encontrada.", 404);
    }

    return NextResponse.json(profile, {
      headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el perfil de la persona.");
  }
}
