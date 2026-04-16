import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cycleKey: string }> }
) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  try {
    const { cycleKey } = await context.params;
    const decodedKey = decodeURIComponent(cycleKey);

    const result = await query<{
      min_date: string | null;
      max_date: string | null;
    }>(
      `
      select
        min(event_date)::text as min_date,
        max(event_date)::text as max_date
      from mdl.prod_ref_vegetativo_subset_scd2
      where cycle_key = $1
        and activity_code = 'ILUMINACION'
      `,
      [decodedKey]
    );

    const row = result.rows[0];
    return NextResponse.json({
      min: row?.min_date ?? null,
      max: row?.max_date ?? null,
    });
  } catch (error) {
    console.error("Error fetching cycle range:", error);
    return NextResponse.json(
      { error: "Failed to fetch cycle range" },
      { status: 500 }
    );
  }
}

