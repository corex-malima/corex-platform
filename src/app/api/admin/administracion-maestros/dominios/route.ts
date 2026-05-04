import { NextRequest, NextResponse } from "next/server";

import {
  adminDomainUpsertSchema,
  adminDomainValidityPatchSchema,
} from "@/lib/admin-masters-schemas";
import { enforceAdminMaestrosRateLimit, parseAndValidate } from "@/lib/admin-mutation-guard";
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

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "dominios", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminDomainUpsertSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    await upsertAdminDomain({
      domainCode: data!.domainCode,
      domainName: data!.domainName,
      domainDescription: data!.domainDescription ?? null,
      displayOrder: data!.displayOrder,
      isValid: data!.isValid,
      actorId: access.username,
      changeReason: data!.changeReason ?? "manual_update",
    });
    const refreshed = await loadAdminCatalogs();
    return NextResponse.json({ domains: refreshed.domains }, { headers: { "Cache-Control": "no-store" } });
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

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "dominios", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminDomainValidityPatchSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    await setAdminDomainValidity(
      data!.domainCode,
      data!.isValid,
      access.username,
      data!.changeReason ?? "manual_update",
    );
    const refreshed = await loadAdminCatalogs();
    return NextResponse.json({ domains: refreshed.domains }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cambiar la validez del dominio.", requestId);
  }
}
