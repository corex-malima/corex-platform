import { type NextRequest } from "next/server";
import type { z } from "zod";

import { apiJsonError } from "@/lib/api-error";
import { checkRequestRateLimit, getEnvNumber } from "@/server/security/rate-limit";

import { formatZodIssue } from "@/lib/admin-masters-schemas";

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

/**
 * Rate limit canon para mutaciones de Admin Masters.
 *
 * Defensa en profundidad sobre el RBAC superadmin: limita 20 escrituras/minuto
 * por IP+usuario aunque la cuenta tenga acceso superadmin completo.
 */
export function enforceAdminMaestrosRateLimit(
  request: NextRequest,
  scope: string,
  requestId: string,
  username?: string,
) {
  const limit = getEnvNumber("ADMIN_MAESTROS_RATE_LIMIT", DEFAULT_LIMIT);
  const windowMs = getEnvNumber("ADMIN_MAESTROS_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS);

  const gate = checkRequestRateLimit({
    request,
    scope: `admin-maestros:${scope}`,
    suffix: username,
    limit,
    windowMs,
  });

  if (!gate.allowed) {
    return apiJsonError(
      "Demasiados cambios en poco tiempo. Espera unos segundos.",
      429,
      requestId,
      { "Retry-After": String(gate.retryAfterSeconds) },
    );
  }

  return null;
}

/**
 * Parsea cuerpo de request validándolo con zod. Devuelve `null + Response`
 * en error, o `data + null` en éxito.
 *
 * Uso:
 *   const { data, errorResponse } = await parseAndValidate(request, schema, requestId);
 *   if (errorResponse) return errorResponse;
 *   // data ya es del tipo seguro inferido del schema
 */
export async function parseAndValidate<T extends z.ZodTypeAny>(
  request: NextRequest,
  schema: T,
  requestId: string,
): Promise<{ data: z.infer<T> | null; errorResponse: Response | null }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      data: null,
      errorResponse: apiJsonError("JSON invalido en el cuerpo de la peticion.", 400, requestId),
    };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      data: null,
      errorResponse: apiJsonError(formatZodIssue(parsed.error.issues), 400, requestId),
    };
  }

  return { data: parsed.data, errorResponse: null };
}
