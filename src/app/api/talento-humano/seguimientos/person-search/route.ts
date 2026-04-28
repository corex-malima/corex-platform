import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { handleApiError } from "@/lib/api-error";
import { searchPersons } from "@/lib/talento-humano-seguimientos-person";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() ?? "";
    const asOfDate = searchParams.get("asOfDate")?.trim() || new Date().toISOString().slice(0, 10);

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchPersons(q, asOfDate);

    return NextResponse.json({ results }, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    return handleApiError(error, "No se pudo buscar personas.");
  }
}
