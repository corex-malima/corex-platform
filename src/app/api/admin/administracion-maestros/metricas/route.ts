import { NextRequest, NextResponse } from "next/server";

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

  try {
    const body = await request.json();
    if (!body.metricCode || !body.metricName || !body.dataTypeCode || !body.directionCode) {
      return apiJsonError("metricCode, metricName, dataTypeCode y directionCode son obligatorios.", 400, requestId);
    }
    await createMetric({
      metricCode: String(body.metricCode),
      metricName: String(body.metricName),
      metricDescription: body.metricDescription ?? null,
      dataTypeCode: String(body.dataTypeCode),
      directionCode: String(body.directionCode),
      unitCode: body.unitCode ?? null,
      notesText: body.notesText ?? null,
      actorId: access.username,
      changeReason: body.changeReason ? String(body.changeReason) : "manual_create",
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

  try {
    const body = await request.json();
    const action = String(body.action ?? "update");

    if (action === "set-validity") {
      if (!body.metricCode || typeof body.isValid !== "boolean") {
        return apiJsonError("metricCode e isValid son obligatorios.", 400, requestId);
      }
      await setMetricValidity(
        String(body.metricCode),
        Boolean(body.isValid),
        access.username,
        body.changeReason ? String(body.changeReason) : "manual_update",
      );
    } else if (action === "update") {
      if (!body.metricCode || !body.metricName || !body.dataTypeCode || !body.directionCode) {
        return apiJsonError("Campos obligatorios faltantes.", 400, requestId);
      }
      await updateMetric({
        metricCode: String(body.metricCode),
        metricName: String(body.metricName),
        metricDescription: body.metricDescription ?? null,
        dataTypeCode: String(body.dataTypeCode),
        directionCode: String(body.directionCode),
        unitCode: body.unitCode ?? null,
        notesText: body.notesText ?? null,
        actorId: access.username,
        changeReason: body.changeReason ? String(body.changeReason) : "manual_update",
      });
    } else {
      return apiJsonError("action debe ser 'update' o 'set-validity'.", 400, requestId);
    }

    const metrics = await listActiveMetrics();
    return NextResponse.json({ metrics }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo actualizar la metrica.", requestId);
  }
}
