import { NextRequest, NextResponse } from "next/server";

import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  loadAdminCatalogs,
  setAdminDomainValidity,
  upsertAdminDomain,
} from "@/lib/admin-masters-catalogs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await loadAdminCatalogs();
    return NextResponse.json({ domains: data.domains }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar dominios.", requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  try {
    const body = await request.json();
    if (!body.domainCode || !body.domainName) {
      return apiJsonError("Codigo y nombre son obligatorios.", 400, requestId);
    }
    await upsertAdminDomain({
      domainCode: String(body.domainCode),
      domainName: String(body.domainName),
      domainDescription: body.domainDescription ?? null,
      displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : 0,
      isValid: body.isValid !== false,
      actorId: access.username,
      changeReason: body.changeReason ? String(body.changeReason) : "manual_update",
    });
    const data = await loadAdminCatalogs();
    return NextResponse.json({ domains: data.domains }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo guardar el dominio.", requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  try {
    const body = await request.json();
    if (!body.domainCode || typeof body.isValid !== "boolean") {
      return apiJsonError("domainCode e isValid son obligatorios.", 400, requestId);
    }
    await setAdminDomainValidity(
      String(body.domainCode),
      Boolean(body.isValid),
      access.username,
      body.changeReason ? String(body.changeReason) : "manual_update",
    );
    const data = await loadAdminCatalogs();
    return NextResponse.json({ domains: data.domains }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cambiar la validez del dominio.", requestId);
  }
}
