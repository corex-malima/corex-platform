import { NextRequest, NextResponse } from "next/server";

import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { canAccessResource } from "@/lib/access-control";
import { loadFollowupCatalogs } from "@/lib/talento-humano-seguimientos-catalogs";
import { loadAssociatedWorkers } from "@/lib/talento-humano-seguimientos-person";
import { loadScheduledFollowups } from "@/lib/talento-humano-seguimientos-schedule";
import type { EmployeeFollowupBootPayload } from "@/modules/talento-humano/seguimientos/server/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const access = await getCurrentUserAccess();
    if (!access) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const canWrite = access.isSuperadmin || canAccessResource("panel:tthh.followups.write", access.allowedResources, access.isSuperadmin);
    const canSensitive = access.isSuperadmin || canAccessResource("panel:tthh.followups.sensitive", access.allowedResources, access.isSuperadmin);
    const canAdmin = access.isSuperadmin || canAccessResource("panel:tthh.followups.admin", access.allowedResources, access.isSuperadmin);

    const asOfDate = new Date().toISOString().slice(0, 10);

    const [catalogs, associatedWorkers] = await Promise.all([
      loadFollowupCatalogs(),
      loadAssociatedWorkers(),
    ]);

    const payload: EmployeeFollowupBootPayload = {
      catalogs,
      options: {
        routes: [
          { value: "AGR", label: "Agrícola" },
          { value: "ADM", label: "Administrativo" },
        ],
        associatedWorkers,
        statuses: [
          { value: "pending", label: "Pendiente" },
          { value: "registered", label: "Registrado" },
          { value: "annulled", label: "Anulado" },
        ],
      },
      permissions: { canWrite, canSensitive, canAdmin },
    };

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=120, stale-while-revalidate=300" },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el módulo de seguimientos.");
  }
}
