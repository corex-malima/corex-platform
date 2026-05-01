import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

function loadEnvFile(filePath) {
  const result = {};
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

const envPath = path.resolve(process.cwd(), ".env.local");
const env = loadEnvFile(envPath);

const pool = new Pool({
  host: env.DATABASE_HOST,
  port: Number(env.DATABASE_PORT),
  database: env.BODEGA_DATABASE_NAME || "db_storageroom",
  user: env.DATABASE_USER,
  password: env.DATABASE_PASSWORD,
  ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  max: Number(env.DATABASE_POOL_MAX || 10),
  idleTimeoutMillis: Number(env.DATABASE_IDLE_TIMEOUT_MS || 30000),
});

const staticStatements = [
  `
create table if not exists public.sr_ref_unit_id_core_scd2 (
      record_id text primary key,
      unit_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `,
  `
create table if not exists public.sr_dim_unit_profile_scd2 (
      record_id text primary key,
      unit_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      unit_code text not null,
      unit_name text not null,
      unit_symbol text not null,
      unit_dimension text not null,
      decimal_precision integer not null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `,
  `
create unique index if not exists sr_ref_unit_id_core_scd2_current_idx
on public.sr_ref_unit_id_core_scd2 (unit_id)
      where is_current
  `,
  `
create unique index if not exists sr_dim_unit_profile_scd2_current_idx
on public.sr_dim_unit_profile_scd2 (unit_id)
      where is_current
  `,
  `
create unique index if not exists sr_dim_unit_profile_scd2_current_code_unique_idx
on public.sr_dim_unit_profile_scd2 (lower(regexp_replace(trim(unit_code), '\\s+', ' ', 'g')))
      where is_current = true
        and is_valid = true
  `,
  `
create table if not exists public.sr_ref_category_id_core_scd2 (
      record_id text primary key,
      category_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `,
  `
create table if not exists public.sr_dim_category_profile_scd2 (
      record_id text primary key,
      category_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      category_code text not null,
      category_name text not null,
      category_level text not null,
      parent_category_id text null,
      sort_order integer not null,
      category_description text null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `,
  `
create unique index if not exists sr_ref_category_id_core_scd2_current_idx
on public.sr_ref_category_id_core_scd2 (category_id)
      where is_current
  `,
  `
create unique index if not exists sr_dim_category_profile_scd2_current_idx
on public.sr_dim_category_profile_scd2 (category_id)
      where is_current
  `,
  `
create unique index if not exists sr_dim_category_profile_scd2_current_code_unique_idx
on public.sr_dim_category_profile_scd2 (lower(regexp_replace(trim(category_code), '\\s+', ' ', 'g')))
      where is_current = true
        and is_valid = true
  `,
  `
create unique index if not exists sr_dim_category_profile_scd2_name_parent_unique_idx
on public.sr_dim_category_profile_scd2 (
        lower(regexp_replace(trim(category_name), '\\s+', ' ', 'g')),
        category_level,
        coalesce(parent_category_id, '')
      )
      where is_current = true
        and is_valid = true
  `,
  `
create table if not exists public.sr_ref_product_id_core_scd2 (
      record_id text primary key,
      product_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `,
  `
create table if not exists public.sr_dim_product_profile_scd2 (
      record_id text primary key,
      product_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      product_code text not null,
      product_name text not null,
      product_description text null,
      base_unit_id text not null,
      category_id text not null,
      active_component_mode text not null,
      active_component_name text null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `,
  `
create unique index if not exists sr_ref_product_id_core_scd2_current_idx
on public.sr_ref_product_id_core_scd2 (product_id)
      where is_current
  `,
  `
create unique index if not exists sr_dim_product_profile_scd2_current_idx
on public.sr_dim_product_profile_scd2 (product_id)
      where is_current
  `,
  `
create unique index if not exists sr_dim_product_profile_scd2_current_code_unique_idx
on public.sr_dim_product_profile_scd2 (lower(regexp_replace(trim(product_code), '\\s+', ' ', 'g')))
      where is_current = true
        and is_valid = true
  `,
  `
create unique index if not exists sr_dim_product_profile_scd2_current_name_unique_idx
on public.sr_dim_product_profile_scd2 (lower(regexp_replace(trim(product_name), '\\s+', ' ', 'g')))
      where is_current = true
        and is_valid = true
  `,
];

async function ensureUsageBridge(client) {
  const result = await client.query(
    `
      select column_name
      from information_schema.columns
      where table_schema = 'public'
and table_name = 'sr_bridge_product_usage_scd2'
    `,
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  const needsMigration = columns.size > 0 && !columns.has("activity_id");

  if (needsMigration) {
await client.query("drop table if exists public.sr_bridge_product_usage_scd2");
  }

  await client.query(`
create table if not exists public.sr_bridge_product_usage_scd2 (
      record_id text primary key,
      product_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      branch_order integer not null,
      activity_id text not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);

  await client.query(`
create index if not exists sr_bridge_product_usage_scd2_current_product_idx
on public.sr_bridge_product_usage_scd2 (product_id, branch_order)
      where is_current = true
  `);

  await client.query(`
create unique index if not exists sr_bridge_product_usage_scd2_current_branch_unique_idx
on public.sr_bridge_product_usage_scd2 (product_id, branch_order)
      where is_current = true
  `);

  await client.query(`
create unique index if not exists sr_bridge_product_usage_scd2_current_activity_unique_idx
on public.sr_bridge_product_usage_scd2 (product_id, activity_id)
      where is_current = true
  `);
}

async function ensureProductAndPresentationSchema(client) {
  await client.query(`
alter table public.sr_dim_product_profile_scd2
      drop column if exists commercial_name
  `);

  await client.query(`
create table if not exists public.sr_ref_product_presentation_id_core_scd2 (
      record_id text primary key,
      presentation_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);

  await client.query(`
create table if not exists public.sr_dim_product_presentation_profile_scd2 (
      record_id text primary key,
      presentation_id text not null,
      product_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      presentation_code text not null,
      presentation_name text not null,
      commercial_name text null,
      package_name text null,
      presentation_quantity numeric(18, 6) null,
      presentation_unit_id text null,
      equivalent_base_quantity numeric(18, 6) null,
      conversion_mode text null,
      base_unit_id text null,
      allows_fractioning boolean not null,
      operational_note text null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);

  await client.query(`
alter table public.sr_dim_product_presentation_profile_scd2
      add column if not exists package_name text null
  `);

  await client.query(`
alter table public.sr_dim_product_presentation_profile_scd2
      add column if not exists presentation_quantity numeric(18, 6) null
  `);

  await client.query(`
alter table public.sr_dim_product_presentation_profile_scd2
      add column if not exists presentation_unit_id text null
  `);

  await client.query(`
alter table public.sr_dim_product_presentation_profile_scd2
      add column if not exists conversion_mode text null
  `);

  await client.query(`
alter table public.sr_dim_product_presentation_profile_scd2
      drop column if exists presentation_unit_name
  `);

  await client.query(`
create unique index if not exists sr_ref_product_presentation_id_core_scd2_current_idx
on public.sr_ref_product_presentation_id_core_scd2 (presentation_id)
      where is_current
  `);

  await client.query(`
create unique index if not exists sr_dim_product_presentation_profile_scd2_current_idx
on public.sr_dim_product_presentation_profile_scd2 (presentation_id)
      where is_current
  `);

  await client.query(`
create unique index if not exists sr_dim_product_presentation_profile_scd2_current_code_unique_idx
on public.sr_dim_product_presentation_profile_scd2 (lower(regexp_replace(trim(presentation_code), '\\s+', ' ', 'g')))
      where is_current = true
        and is_valid = true
  `);
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("begin");
    for (const statement of staticStatements) {
      await client.query(statement);
    }
    await ensureProductAndPresentationSchema(client);
    await ensureUsageBridge(client);
    await client.query("commit");
console.log("Storageroom DB schema initialized in db_storageroom.");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

