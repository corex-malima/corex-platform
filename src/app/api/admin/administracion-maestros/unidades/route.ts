import { NextRequest, NextResponse } from "next/server";

import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  createUnit,
  listActiveUnits,
  listUnitHistory,
  setUnitValidity,
  updateUnit,
} from "@/lib/admin-masters-units";
import { loadAdminCatalogs } from "@/lib/admin-masters-catalogs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const historyOf = url.searchParams.get("historyOf");
    if (historyOf) {
      const history = await listUnitHistory(historyOf);
      return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
    }

    const [units, catalogs] = await Promise.all([listActiveUnits(), loadAdminCatalogs()]);
    const unitCategories = catalogs.items.filter((i) => i.catalogCode === "unit_categories");
    return NextResponse.json(
      { units, unitCategories },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "No se pudo cargar unidades.", requestId);
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
    if (!body.unitCode || !body.unitName) {
      return apiJsonError("unitCode y unitName son obligatorios.", 400, requestId);
    }
    await createUnit({
      unitCode: String(body.unitCode),
      unitName: String(body.unitName),
      unitSymbol: body.unitSymbol ?? null,
      unitCategoryCode: body.unitCategoryCode ?? null,
      notesText: body.notesText ?? null,
      actorId: access.username,
      changeReason: body.changeReason ? String(body.changeReason) : "manual_create",
    });
    const units = await listActiveUnits();
    return NextResponse.json({ units }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo crear la unidad.", requestId);
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
    const action = String(body.action ?? "update");

    if (action === "set-validity") {
      if (!body.unitCode || typeof body.isValid !== "boolean") {
        return apiJsonError("unitCode e isValid son obligatorios.", 400, requestId);
      }
      await setUnitValidity(
        String(body.unitCode),
        Boolean(body.isValid),
        access.username,
        body.changeReason ? String(body.changeReason) : "manual_update",
      );
    } else if (action === "update") {
      if (!body.unitCode || !body.unitName) {
        return apiJsonError("unitCode y unitName son obligatorios.", 400, requestId);
      }
      await updateUnit({
        unitCode: String(body.unitCode),
        unitName: String(body.unitName),
        unitSymbol: body.unitSymbol ?? null,
        unitCategoryCode: body.unitCategoryCode ?? null,
        notesText: body.notesText ?? null,
        actorId: access.username,
        changeReason: body.changeReason ? String(body.changeReason) : "manual_update",
      });
    } else {
      return apiJsonError("action debe ser 'update' o 'set-validity'.", 400, requestId);
    }

    const units = await listActiveUnits();
    return NextResponse.json({ units }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo actualizar la unidad.", requestId);
  }
}
