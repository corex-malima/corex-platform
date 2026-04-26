import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { apiJsonError } from "@/lib/api-error";
import { getRequestId } from "@/lib/request-id";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cycleKey: string }> }
) {
  const requestId = getRequestId(request);
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
    return NextResponse.json(
      {
        min: row?.min_date ?? null,
        max: row?.max_date ?? null,
      },
      {
        headers: {
          // Cycle range cambia raramente (depende de event_date de
          // ILUMINACION en SCD2); cacheable corto con SWR.
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    return apiJsonError(
      error instanceof Error ? error.message : "Failed to fetch cycle range",
      500,
      requestId
    );
  }
}

