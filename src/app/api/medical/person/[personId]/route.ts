import { type NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/api-error";
import { requireAuth, requireResourceAccess } from "@/lib/api-auth";
import { getRequestId } from "@/lib/request-id";
import { getMedicalPersonDetailByPersonId } from "@/lib/salud";

export const dynamic = "force-dynamic";

const SOURCE_PANEL: Record<string, string> = {
  // Cuando el panel se invoca desde Colaboradores (Analítica/TTHH/Explorador),
  // se exige el panel granular específico. Sin este chequeo, la regla central
  // de /api/medical/person evalúa los dos panels en OR y dejaba pasar a usuarios
  // que tuvieran solo panel:person-sheet.medical (Fenograma).
  colaboradores: "panel:tthh.collaborators.medical",
  // Default explícito para fenograma — alinea el chequeo cuando el caller lo
  // especifica. Sin source, se mantiene compat con la regla central.
  fenograma: "panel:person-sheet.medical",
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ personId: string }> },
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  // Discriminación de RBAC por contexto. Necesario porque el endpoint es
  // compartido entre Fenograma (modal de ficha del bloque) y Colaboradores
  // (explorador TTHH), y la regla central acepta cualquiera de los dos panels.
  const source = request.nextUrl.searchParams.get("source");
  if (source) {
    const panel = SOURCE_PANEL[source];
    if (panel) {
      const requestId = getRequestId(request);
      const denied = await requireResourceAccess(panel, requestId);
      if (denied) return denied;
    }
  }

  try {
    const { personId } = await context.params;
    const data = await getMedicalPersonDetailByPersonId(decodeURIComponent(personId));

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar la ficha medica del personal.");
  }
}

