import { NextRequest, NextResponse } from "next/server";

import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import { canAccessResource } from "@/lib/access-control";
import { checkRequestRateLimit, getEnvNumber } from "@/server/security/rate-limit";
import { createFollowupResponseSchema } from "@/lib/talento-humano-seguimientos-schemas";
import { createFollowupResponse, listFollowupResponses } from "@/lib/talento-humano-seguimientos-responses";
import { createRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

// ── GET: listar respuestas ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const personId = searchParams.get("personId")?.trim() || undefined;
    const uniqueFollowUpCode = searchParams.get("uniqueFollowUpCode")?.trim() || undefined;
    const includeAll = searchParams.get("includeAll") === "true";

    const responses = await listFollowupResponses({ personId, uniqueFollowUpCode, includeAll });

    return NextResponse.json({ responses }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar los seguimientos registrados.");
  }
}

// ── POST: crear respuesta ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;

  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  // RBAC: requiere write o superadmin
  const canWrite = access.isSuperadmin
    || canAccessResource("panel:tthh.followups.write", access.allowedResources, access.isSuperadmin);
  if (!canWrite) {
    return apiJsonError("No tienes permiso para registrar seguimientos.", 403, requestId);
  }

  // Rate limit
  const rl = checkRequestRateLimit({
    request,
    scope: "tthh-followups:write",
    suffix: access.username,
    limit: getEnvNumber("TTHH_FOLLOWUPS_WRITE_RATE_LIMIT", 30),
    windowMs: getEnvNumber("TTHH_FOLLOWUPS_WRITE_RATE_LIMIT_WINDOW_MS", 60_000),
  });
  if (!rl.allowed) {
    return apiJsonError("Demasiados intentos. Intente más tarde.", 429, requestId, {
      "Retry-After": String(rl.retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiJsonError("Cuerpo de la solicitud inválido.", 400, requestId);
  }

  const parsed = createFollowupResponseSchema.safeParse(body);
  if (!parsed.success) {
    return apiJsonError("Datos del formulario inválidos.", 400, requestId);
  }

  try {
    const runId = createRequestId();
    const result = await createFollowupResponse(parsed.data, access.username, runId);

    return NextResponse.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo registrar el seguimiento.", requestId);
  }
}
