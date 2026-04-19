import { type NextRequest, NextResponse } from "next/server";

import { apiJsonError, handleApiError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";
import {
  checkRequestRateLimit,
  getEnvNumber,
} from "@/server/security/rate-limit";
import {
  DeadPlantsReseedConflictError,
  patchDeadPlantsReseedRecords,
  type PatchRecordsInput,
} from "@/lib/dead-plants-reseed";
import { requireDeadPlantsReseedWrite } from "@/app/api/dead-plants-reseed/_shared";

export const dynamic = "force-dynamic";

const WRITE_RATE_LIMIT = getEnvNumber("DEAD_PLANTS_RESEED_RATE_LIMIT", 20);
const WRITE_RATE_LIMIT_WINDOW_MS = getEnvNumber("DEAD_PLANTS_RESEED_RATE_LIMIT_WINDOW_MS", 60_000);

export async function PATCH(request: NextRequest) {
  const { error, access } = await requireDeadPlantsReseedWrite(request);
  if (error) return error;

  const rate = checkRequestRateLimit({
    request,
    scope: "dead-plants-reseed:write",
    suffix: access.username,
    limit: WRITE_RATE_LIMIT,
    windowMs: WRITE_RATE_LIMIT_WINDOW_MS,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        message: "Demasiados intentos. Intenta nuevamente en un momento.",
        error: "RATE_LIMIT",
        requestId: getRequestId(request),
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      },
    );
  }

  try {
    const payload = (await request.json()) as PatchRecordsInput;
    const data = await patchDeadPlantsReseedRecords(payload, access.username);

    return NextResponse.json(
      { data },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof DeadPlantsReseedConflictError) {
      return apiJsonError(error.message, error.status, getRequestId(request));
    }

    if (error instanceof Error) {
      return apiJsonError(error.message, 400, getRequestId(request));
    }

    return handleApiError(error, "No se pudieron editar los registros.");
  }
}
