import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { checkRateLimit } from "@/server/security/rate-limit";
import { getSession } from "@/lib/auth";
import type {
  PoscosechaSkuInput,
  PoscosechaSkuPayload,
} from "@/lib/postcosecha-sku-types";
import {
  createPostharvestSku,
  listCurrentPostharvestSkus,
} from "@/lib/postcosecha-skus";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ message, error: message }, { status, headers });
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await listCurrentPostharvestSkus();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar el maestro de SKU de postcosecha.");
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  const rl = checkRateLimit(`skus:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return jsonError(
      "Demasiados intentos. Intenta nuevamente en un momento.",
      429,
      { "Retry-After": String(rl.retryAfterSeconds) },
    );
  }

  try {
    const payload = (await request.json()) as PoscosechaSkuInput;
    const actorId = (await getSession()) ?? "corex_postcosecha_ui";
    const data = await createPostharvestSku(payload, actorId);

    return NextResponse.json<PoscosechaSkuPayload>(
      { data: data! },
      {
        status: 201,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }

    return handleApiError(error, "No se pudo crear el SKU de postcosecha.");
  }
}
