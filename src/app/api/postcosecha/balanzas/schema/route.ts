import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ message: "Schema endpoint removed — use /api/postcosecha/balanzas" }, { status: 410 });
}
