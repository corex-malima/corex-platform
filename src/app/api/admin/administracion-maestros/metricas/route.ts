import { NextRequest, NextResponse } from "next/server";

import {
  adminMetricPatchSchema,
  adminMetricUpsertSchema,
} from "@/lib/admin-masters-schemas";
import { enforceAdminMaestrosRateLimit, parseAndValidate } from "@/lib/admin-mutation-guard";
import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  createMetric,
  listActiveMetrics,
  listMetricHistory,
  setMetricValidity,
  updateMetric,
} from "@/lib/admin-masters-metrics";
import { listActiveUnits } from "@/lib/admin-masters-units";
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
      const history = await listMetricHistory(historyOf);
      return NextResponse.json({ history }, { headers: { "Cache-Control": "no-store" } });
    }

    const [metrics, units, catalogs] = await Promise.all([
      listActiveMetrics(),
      listActiveUnits(),
      loadAdminCatalogs(),
    ]);
    const dataTypes = catalogs.items.filter((i) => i.catalogCode === "metric_data_types");
    const directions = catalogs.items.filter((i) => i.catalogCode === "metric_directions");

    return NextResponse.json(
      { metrics, units, dataTypes, directions },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleApiError(error, "No se pudo cargar metricas.", requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "metricas", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminMetricUpsertSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    await createMetric({
      metricCode: data!.metricCode,
      metricName: data!.metricName,
      metricDescription: data!.metricDescription ?? null,
      dataTypeCode: data!.dataTypeCode,
      directionCode: data!.directionCode,
      unitCode: data!.unitCode ?? null,
      notesText: data!.notesText ?? null,
      actorId: access.username,
      changeReason: data!.changeReason ?? "manual_create",
    });
    const metrics = await listActiveMetrics();
    return NextResponse.json({ metrics }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo crear la metrica.", requestId);
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;
  const access = await getCurrentUserAccess();
  if (!access) return apiJsonError("No autenticado.", 401, requestId);

  const rateLimitError = enforceAdminMaestrosRateLimit(request, "metricas", requestId, access.username);
  if (rateLimitError) return rateLimitError;

  const { data, errorResponse } = await parseAndValidate(request, adminMetricPatchSchema, requestId);
  if (errorResponse) return errorResponse;

  try {
    if (data!.action === "set-validity") {
      await setMetricValidity(
        data!.metricCode,
        data!.isValid,
        access.username,
        data!.changeReason ?? "manual_update",
      );
    } else {
      await updateMetric({
        metricCode: data!.metricCode,
        metricName: data!.metricName,
        metricDescription: data!.metricDescription ?? null,
        dataTypeCode: data!.dataTypeCode,
        directionCode: data!.directionCode,
        unitCode: data!.unitCode ?? null,
        notesText: data!.notesText ?? null,
        actorId: access.username,
        changeReason: data!.changeReason ?? "manual_update",
      });
    }

    const metrics = await listActiveMetrics();
    return NextResponse.json({ metrics }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo actualizar la metrica.", requestId);
  }
}
