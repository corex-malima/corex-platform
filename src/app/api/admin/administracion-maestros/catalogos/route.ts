import { NextRequest, NextResponse } from "next/server";

import {
  adminCatalogUpsertSchema,
  adminCatalogValidityPatchSchema,
} from "@/lib/admin-masters-schemas";
import { enforceAdminMaestrosRateLimit, parseAndValidate } from "@/lib/admin-mutation-guard";
import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  loadAdminCatalogs,
  setAdminCatalogGroupValidity,
  setAdminCatalogItemValidity,
  upsertAdminCatalogGroup,
  upsertAdminCatalogItem,
} from "@/lib/admin-masters-catalogs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await loadAdminCatalogs();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar catalogos.", requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "catalogos", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminCatalogUpsertSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    const reason = data!.changeReason ?? "manual_update";

    if (data!.kind === "group") {
      await upsertAdminCatalogGroup({
        catalogCode: data!.catalogCode,
        catalogName: data!.catalogName,
        catalogDescription: data!.catalogDescription ?? null,
        domainCode: data!.domainCode,
        isSystemCatalog: data!.isSystemCatalog,
        actorId: access.username,
        changeReason: reason,
      });
    } else {
      await upsertAdminCatalogItem({
        catalogCode: data!.catalogCode,
        itemCode: data!.itemCode,
        itemLabelEs: data!.itemLabelEs,
        itemLabelEn: data!.itemLabelEn ?? null,
        itemDescription: data!.itemDescription ?? null,
        displayOrder: data!.displayOrder,
        actorId: access.username,
        changeReason: reason,
      });
    }

    const refreshed = await loadAdminCatalogs();
    return NextResponse.json(refreshed, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo guardar el catalogo.", requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "catalogos", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminCatalogValidityPatchSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    const reason = data!.changeReason ?? "manual_update";

    if (data!.kind === "group") {
      await setAdminCatalogGroupValidity(data!.catalogCode, data!.isValid, access.username, reason);
    } else {
      await setAdminCatalogItemValidity(
        data!.catalogCode,
        data!.itemCode,
        data!.isValid,
        access.username,
        reason,
      );
    }

    const refreshed = await loadAdminCatalogs();
    return NextResponse.json(refreshed, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cambiar la validez.", requestId);
  }
}
