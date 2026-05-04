import { NextRequest, NextResponse } from "next/server";

import {
  adminGoalTargetPatchSchema,
  adminGoalTargetUpsertSchema,
} from "@/lib/admin-masters-schemas";
import { enforceAdminMaestrosRateLimit, parseAndValidate } from "@/lib/admin-mutation-guard";
import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  createGoalTarget,
  listActiveGoalTargets,
  listGoalTargetHistory,
  setGoalTargetValidity,
  updateGoalTarget,
} from "@/lib/admin-masters-goals";
import { listActiveMetrics } from "@/lib/admin-masters-metrics";
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
      const history = await listGoalTargetHistory(historyOf);
      return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
    }

    const [targets, metrics, catalogs] = await Promise.all([
      listActiveGoalTargets(),
      listActiveMetrics(),
      loadAdminCatalogs(),
    ]);
    const operators = catalogs.items.filter((i) => i.catalogCode === "comparison_operators");
    const goalTypes = catalogs.items.filter((i) => i.catalogCode === "goal_types");

    return NextResponse.json(
      { targets, metrics, domains: catalogs.domains, operators, goalTypes },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "No se pudo cargar metas y objetivos.", requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "metas", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminGoalTargetUpsertSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    await createGoalTarget({
      targetCode: data!.targetCode,
      targetName: data!.targetName ?? data!.targetCode,
      targetDescription: data!.targetDescription ?? null,
      metricCode: data!.metricCode ?? null,
      operatorCode: data!.operatorCode ?? null,
      valueMin: data!.valueMin ?? null,
      valueMax: data!.valueMax ?? null,
      valueText: data!.valueText ?? null,
      notesText: data!.notesText ?? null,
      domainCodes: data!.domainCodes ?? [],
      typeItemCodes: data!.typeItemCodes ?? [],
      validFromDate: data!.validFromDate,
      actorId: access.username,
      changeReason: data!.changeReason ?? "manual_create",
      targetScopeJsonb: data!.targetScopeJsonb ?? null,
    });

    const targets = await listActiveGoalTargets();
    return NextResponse.json({ targets }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo crear la meta.", requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "metas", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminGoalTargetPatchSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    if (data!.action === "set-validity") {
      await setGoalTargetValidity(
        data!.targetCode,
        data!.isValid,
        access.username,
        data!.changeReason ?? "manual_update",
      );
    } else {
      await updateGoalTarget({
        targetCode: data!.targetCode,
        targetName: data!.targetName ?? data!.targetCode,
        targetDescription: data!.targetDescription ?? null,
        metricCode: data!.metricCode ?? null,
        operatorCode: data!.operatorCode ?? null,
        valueMin: data!.valueMin ?? null,
        valueMax: data!.valueMax ?? null,
        valueText: data!.valueText ?? null,
        notesText: data!.notesText ?? null,
        domainCodes: data!.domainCodes ?? [],
        typeItemCodes: data!.typeItemCodes ?? [],
        validFromDate: data!.validFromDate,
        actorId: access.username,
        changeReason: data!.changeReason ?? "manual_update",
        targetScopeJsonb: data!.targetScopeJsonb ?? null,
      });
    }

    const targets = await listActiveGoalTargets();
    return NextResponse.json({ targets }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo actualizar la meta.", requestId);
  }
}
