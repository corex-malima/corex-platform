import { type NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { getSession } from "@/lib/auth";
import type { LaboratoryCategoryInput, LaboratoryCategoryPayload } from "@/lib/laboratory-master-types";
import { createLaboratoryCategory, listCurrentLaboratoryCategories } from "@/lib/laboratory-masters";
import { checkRateLimit } from "@/server/security/rate-limit";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ message, error: message }, { status, headers });
}

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const data = await listCurrentLaboratoryCategories();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo cargar los tipos de Laboratorio.");
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "local";
  const rl = checkRateLimit(`laboratorio-tipos:${ip}`, 20, 60_000);
  if (!rl.allowed) {
    return jsonError(
      "Demasiados intentos. Intenta nuevamente en un momento.",
      429,
      { "Retry-After": String(rl.retryAfterSeconds) },
    );
  }

  try {
    const payload = (await request.json()) as LaboratoryCategoryInput;
    const actorId = (await getSession()) ?? "corex_laboratory_ui";
    const data = await createLaboratoryCategory(payload, actorId);

    return NextResponse.json<LaboratoryCategoryPayload>(
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

    return handleApiError(error, "No se pudo crear el tipo de Laboratorio.");
  }
}
