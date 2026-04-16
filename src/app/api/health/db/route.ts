import { NextRequest, NextResponse } from "next/server";

import { requireAuth } from "@/lib/api-auth";
import { getDatabaseHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const health = await getDatabaseHealth();

  return NextResponse.json(health, {
    status: health.connected ? 200 : health.configured ? 503 : 200,
  });
}
