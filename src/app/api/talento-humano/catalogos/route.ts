import { NextRequest, NextResponse } from "next/server";

import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  listTthhCatalogs,
  setTthhCatalogValidity,
  upsertTthhCatalogDomain,
  upsertTthhCatalogGroup,
  upsertTthhCatalogItem,
} from "@/lib/admin-masters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await listTthhCatalogs();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar catalogos TTHH.", requestId);
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
    const action = String(body.action ?? "upsert");

    if (kind === "domain" && action === "upsert") {
      if (!body.domainCode || !body.domainName) return apiJsonError("Codigo y nombre de dominio son obligatorios.", 400, requestId);
      await upsertTthhCatalogDomain({ ...body, actorId: access.username });
    } else if (kind === "group" && action === "upsert") {
      if (!body.catalogCode || !body.catalogName) return apiJsonError("Codigo y nombre de catalogo son obligatorios.", 400, requestId);
      await upsertTthhCatalogGroup({ ...body, actorId: access.username });
    } else if (kind === "item" && action === "upsert") {
      if (!body.catalogCode || !body.itemCode || !body.itemLabelEs) return apiJsonError("Catalogo, codigo y etiqueta son obligatorios.", 400, requestId);
      await upsertTthhCatalogItem({ ...body, actorId: access.username });
    } else if ((kind === "domain" || kind === "group" || kind === "item") && action === "set-validity") {
      await setTthhCatalogValidity(kind, { ...body, actorId: access.username, isValid: Boolean(body.isValid) });
    } else {
      return apiJsonError("Accion de catalogo no soportada.", 400, requestId);
    }

    const data = await listTthhCatalogs();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo guardar el catalogo.", requestId);
  }
}
