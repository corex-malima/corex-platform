import { type NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

/** Endpoint temporal de diagnóstico — borrar después de confirmar datos */
export async function GET(request: NextRequest) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const results: Record<string, unknown> = {};

  // 1. Columnas de la tabla
  try {
    const cols = await query<{ column_name: string; data_type: string }>(
      `select column_name, data_type
       from information_schema.columns
       where table_schema = 'mdl'
         and table_name   = 'prod_ref_vegetativo_subset_scd2'
       order by ordinal_position`,
      [],
    );
    results.columns = cols.rows;
  } catch (e) {
    results.columns_error = String(e);
  }

  // 2. Conteo por activity_code (sin filtros)
  try {
    const counts = await query<{ activity_code: string; total: string; min_date: unknown; max_date: unknown }>(
      `select activity_code,
              count(*) as total,
              min(event_date) as min_date,
              max(event_date) as max_date
       from mdl.prod_ref_vegetativo_subset_scd2
       group by activity_code
       order by total desc
       limit 20`,
      [],
    );
    results.activity_counts = counts.rows;
  } catch (e) {
    results.activity_counts_error = String(e);
  }

  // 3. Muestra de filas SPMC / ILUMINACION
  try {
    const sample = await query<Record<string, unknown>>(
      `select *
       from mdl.prod_ref_vegetativo_subset_scd2
       where activity_code in ('SPMC','ILUMINACION')
       limit 5`,
      [],
    );
    results.sample_rows = sample.rows;
  } catch (e) {
    results.sample_error = String(e);
  }

  // 4. Prueba del JOIN con camp_dim_cycle_profile_scd2
  try {
    const join_test = await query<Record<string, unknown>>(
      `select v.cycle_key, v.activity_code, v.event_date,
              cp.block_id, cp.variety, cp.sp_type
       from mdl.prod_ref_vegetativo_subset_scd2 v
       left join lateral (
         select cp2.block_id, cp2.variety, cp2.sp_type
         from slv.camp_dim_cycle_profile_scd2 cp2
         where cp2.cycle_key = v.cycle_key
         order by cp2.valid_from desc nulls last
         limit 1
       ) cp on true
       where v.activity_code in ('SPMC','ILUMINACION')
       limit 5`,
      [],
    );
    results.join_test = join_test.rows;
  } catch (e) {
    results.join_test_error = String(e);
  }

  return NextResponse.json(results, { status: 200 });
}

