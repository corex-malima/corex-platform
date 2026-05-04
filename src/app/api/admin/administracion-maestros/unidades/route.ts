import { NextRequest, NextResponse } from "next/server";

import {
  adminUnitPatchSchema,
  adminUnitUpsertSchema,
} from "@/lib/admin-masters-schemas";
import { enforceAdminMaestrosRateLimit, parseAndValidate } from "@/lib/admin-mutation-guard";
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

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "unidades", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminUnitUpsertSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    await createUnit({
      unitCode: data!.unitCode,
      unitName: data!.unitName,
      unitSymbol: data!.unitSymbol ?? null,
      unitCategoryCode: data!.unitCategoryCode ?? null,
      notesText: data!.notesText ?? null,
      actorId: access.username,
      changeReason: data!.changeReason ?? "manual_create",
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

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "unidades", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminUnitPatchSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    if (data!.action === "set-validity") {
      await setUnitValidity(
        data!.unitCode,
        data!.isValid,
        access.username,
        data!.changeReason ?? "manual_update",
      );
    } else {
      await updateUnit({
        unitCode: data!.unitCode,
        unitName: data!.unitName,
        unitSymbol: data!.unitSymbol ?? null,
        unitCategoryCode: data!.unitCategoryCode ?? null,
        notesText: data!.notesText ?? null,
        actorId: access.username,
        changeReason: data!.changeReason ?? "manual_update",
      });
    }

    const units = await listActiveUnits();
    return NextResponse.json({ units }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo actualizar la unidad.", requestId);
  }
}
