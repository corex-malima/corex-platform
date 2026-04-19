import type { NextRequest } from "next/server";

import { apiJsonError } from "@/lib/api-error";
import { getCurrentUserAccess, requireAuth } from "@/lib/api-auth";
import { getRequestId } from "@/lib/request-id";

export async function requireDeadPlantsReseedWrite(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return { error: authError, access: null };

  const access = await getCurrentUserAccess();
  if (!access || !access.isActive) {
    return {
      error: apiJsonError("Missing authentication token", 401, requestId),
      access: null,
    };
  }

  if (!access.isSuperadmin && access.roleCode !== "custom") {
    return {
      error: apiJsonError("No tienes permisos de escritura para este recurso.", 403, requestId),
      access: null,
    };
  }

  return { error: null, access };
}
