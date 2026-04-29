import { NextRequest, NextResponse } from "next/server";

import { requireAuth, getCurrentUserAccess } from "@/lib/api-auth";
import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  createGoalMetric,
  createGoalObjective,
  createGoalTarget,
  createGoalTargetDimension,
  listGoalsAdmin,
  setGoalEntityValidity,
} from "@/lib/admin-masters";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await listGoalsAdmin();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar Metas y Objetivos.", requestId);
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
    const entity = String(body.entity ?? "");
    const action = String(body.action ?? "create");

    if (action === "set-validity") {
      await setGoalEntityValidity(entity, String(body.id ?? ""), Boolean(body.isValid), access.username);
    } else if (entity === "metric") {
      if (!body.metricCode || !body.metricName) return apiJsonError("Codigo y nombre de metrica son obligatorios.", 400, requestId);
      await createGoalMetric(body, access.username);
    } else if (entity === "objective") {
      if (!body.objectiveCode || !body.objectiveName) return apiJsonError("Codigo y nombre de objetivo son obligatorios.", 400, requestId);
      await createGoalObjective(body, access.username);
    } else if (entity === "target") {
      if (!body.targetCode || !body.targetName || !body.metricId || !body.periodStart || !body.periodEnd || !body.targetOperator) {
        return apiJsonError("Meta incompleta: codigo, nombre, metrica, periodo y operador son obligatorios.", 400, requestId);
      }
      await createGoalTarget(body, access.username);
    } else if (entity === "dimension") {
      if (!body.targetId || !body.dimensionType || !body.dimensionKey) return apiJsonError("Dimension incompleta.", 400, requestId);
      await createGoalTargetDimension(body, access.username);
    } else {
      return apiJsonError("Entidad no soportada.", 400, requestId);
    }

    const data = await listGoalsAdmin();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleApiError(error, "No se pudo guardar Metas y Objetivos.", requestId);
  }
}
