import { NextRequest, NextResponse } from "next/server";

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

  try {
    const body = await request.json();
    const kind = String(body.kind ?? "");

    if (kind === "group") {
      if (!body.catalogCode || !body.catalogName || !body.domainCode) {
        return apiJsonError("Codigo, nombre y dominio son obligatorios.", 400, requestId);
      }
      await upsertAdminCatalogGroup({
        catalogCode: String(body.catalogCode),
        catalogName: String(body.catalogName),
        catalogDescription: body.catalogDescription ?? null,
        domainCode: String(body.domainCode),
        isSystemCatalog: Boolean(body.isSystemCatalog),
        actorId: access.username,
        changeReason: body.changeReason ? String(body.changeReason) : "manual_update",
      });
    } else if (kind === "item") {
      if (!body.catalogCode || !body.itemCode || !body.itemLabelEs) {
        return apiJsonError("Catalogo, codigo y etiqueta son obligatorios.", 400, requestId);
      }
      await upsertAdminCatalogItem({
        catalogCode: String(body.catalogCode),
        itemCode: String(body.itemCode),
        itemLabelEs: String(body.itemLabelEs),
        itemLabelEn: body.itemLabelEn ?? null,
        itemDescription: body.itemDescription ?? null,
        displayOrder: body.displayOrder !== undefined ? Number(body.displayOrder) : 0,
        actorId: access.username,
        changeReason: body.changeReason ? String(body.changeReason) : "manual_update",
      });
    } else {
      return apiJsonError("kind debe ser 'group' o 'item'.", 400, requestId);
    }

    const data = await loadAdminCatalogs();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
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

  try {
    const body = await request.json();
    const kind = String(body.kind ?? "");
    if (typeof body.isValid !== "boolean") {
      return apiJsonError("isValid es obligatorio (boolean).", 400, requestId);
    }
    const reason = body.changeReason ? String(body.changeReason) : "manual_update";

    if (kind === "group") {
      if (!body.catalogCode) return apiJsonError("catalogCode es obligatorio.", 400, requestId);
      await setAdminCatalogGroupValidity(String(body.catalogCode), body.isValid, access.username, reason);
    } else if (kind === "item") {
      if (!body.catalogCode || !body.itemCode) {
        return apiJsonError("catalogCode e itemCode son obligatorios.", 400, requestId);
      }
      await setAdminCatalogItemValidity(
        String(body.catalogCode),
        String(body.itemCode),
        body.isValid,
        access.username,
        reason,
      );
    } else {
      return apiJsonError("kind debe ser 'group' o 'item'.", 400, requestId);
    }

    const data = await loadAdminCatalogs();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cambiar la validez.", requestId);
  }
}
