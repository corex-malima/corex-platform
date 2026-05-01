import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

const projectRoot = path.resolve(process.cwd());
const envPath = path.join(projectRoot, ".env.local");

async function loadEnv() {
  const text = await fs.readFile(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!match) continue;
    let [, key, value] = match;
    key = key.trim();
    value = value.trim();
    if (value.startsWith("\"") && value.endsWith("\"")) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function baseConfig(database) {
  return {
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

async function main() {
  await loadEnv();

const bodega = new Client(baseConfig(process.env.BODEGA_DATABASE_NAME ?? "db_storageroom"));
const laboratory = new Client(baseConfig(process.env.LABORATORY_DATABASE_NAME ?? "db_laboratory"));
  await bodega.connect();
  await laboratory.connect();

  const unitResult = await bodega.query(
"select unit_id from public.sr_dim_unit_profile_scd2 where is_current = true and upper(unit_code) = 'CC' limit 1",
  );
  if (!unitResult.rows.length) {
    throw new Error("No existe la unidad CC en db_storageroom.");
  }

  const ccUnitId = unitResult.rows[0].unit_id;
  await laboratory.query(`
    create table if not exists public.lab_ref_category_id_core_scd2 (
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
  `);
  await laboratory.query(`
    create table if not exists public.lab_dim_category_profile_scd2 (
      record_id text primary key,
      category_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      category_code text not null,
      category_name text not null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);
  const categoryResult = await laboratory.query(
    "select category_id from public.lab_dim_category_profile_scd2 where is_current = true and is_valid = true and upper(trim(category_code)) = 'HONGOS' limit 1",
  );
  let fungiCategoryId = categoryResult.rows[0]?.category_id ?? null;
  if (!fungiCategoryId) {
    const now = new Date();
    const runId = `laboratory_seed_category_${Date.now()}`;
    fungiCategoryId = `laboratory_category_${randomUUID()}`;
    await laboratory.query(
      `insert into public.lab_ref_category_id_core_scd2 (record_id, category_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason)
       values ($1, $2, $3, null, true, true, $3, $4, $5, $6)`,
      [randomUUID(), fungiCategoryId, now, runId, "corex_laboratory_seed", "SEED_INITIAL_CATEGORIES"],
    );
    await laboratory.query(
      `insert into public.lab_dim_category_profile_scd2 (record_id, category_id, valid_from, valid_to, is_current, category_code, category_name, is_active, is_valid, loaded_at, run_id, actor_id, change_reason)
       values ($1, $2, $3, null, true, 'HONGOS', 'Hongos', true, true, $3, $4, $5, $6)`,
      [randomUUID(), fungiCategoryId, now, runId, "corex_laboratory_seed", "SEED_INITIAL_CATEGORIES"],
    );
  }
  const existingResult = await laboratory.query(
    "select upper(trim(product_code)) as product_code from public.lab_dim_product_profile_scd2 where is_current = true and is_valid = true",
  );
  const existingCodes = new Set(existingResult.rows.map((row) => row.product_code));

  const seeds = [
    { code: "FB999", name: "TRICHODERMA" },
    { code: "FB996", name: "PAECILOMYCES" },
    { code: "FB998", name: "BEAUVERIA" },
  ].filter((seed) => !existingCodes.has(seed.code));

  for (const seed of seeds) {
    const now = new Date();
    const laboratoryProductId = `laboratory_product_${randomUUID()}`;
    const runId = `laboratory_seed_${Date.now()}_${seed.code}`;

    await laboratory.query(
      `
        insert into public.lab_ref_product_id_core_scd2 (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $3, $4, $5, $6)
      `,
      [randomUUID(), laboratoryProductId, now, runId, "corex_laboratory_seed", "SEED_INITIAL_PRODUCTS"],
    );

    await laboratory.query(
      `
        insert into public.lab_dim_product_profile_scd2 (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, product_code, product_name,
          product_description, category_id, base_unit_id, is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, null, $6, $7, true, true, $3, $8, $9, $10)
      `,
      [
        randomUUID(),
        laboratoryProductId,
        now,
        seed.code,
        seed.name,
        fungiCategoryId,
        ccUnitId,
        runId,
        "corex_laboratory_seed",
        "SEED_INITIAL_PRODUCTS",
      ],
    );

    await laboratory.query(
      `
        insert into public.lab_bridge_product_usage_scd2 (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, branch_order, activity_id, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, 1, 'FM11', true, $3, $4, $5, $6)
      `,
      [randomUUID(), laboratoryProductId, now, runId, "corex_laboratory_seed", "SEED_INITIAL_PRODUCTS"],
    );
  }

  const countResult = await laboratory.query(
    "select count(*)::int as total from public.lab_dim_product_profile_scd2 where is_current = true",
  );

  console.log(
    JSON.stringify({
      seeded: seeds.map((seed) => seed.code),
      total: Number(countResult.rows[0]?.total ?? 0),
    }),
  );

  await bodega.end();
  await laboratory.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

