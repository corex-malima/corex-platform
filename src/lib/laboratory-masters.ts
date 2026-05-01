import crypto from "crypto";
import type { PoolClient, QueryResultRow } from "pg";

import { getCurrentBodegaSourceActivitiesById } from "@/lib/bodega-activity-source";
import {
  listCurrentBodegaProducts,
  listCurrentBodegaUnits,
} from "@/lib/bodega-masters";
import { DRENCH_PROGRAM_ACTIVITY_ID } from "@/lib/campo-drench-program-types";
import { queryLaboratory, withLaboratoryTransaction } from "@/lib/laboratory-db";
import type {
  LaboratoryCategoryInput,
  LaboratoryCategoryRecord,
  LaboratoryProductInput,
  LaboratoryProductRecord,
  LaboratoryRecipeLineInput,
  LaboratoryRecipeLineRecord,
} from "@/lib/laboratory-master-types";

type LaboratoryCountRow = {
  total: number | string | null;
};

type CurrentLaboratoryProductRow = {
  laboratory_product_id: string;
  product_code: string;
  product_name: string;
  product_description: string | null;
  category_id: string;
  category_code: string | null;
  category_name: string | null;
  base_unit_id: string;
  base_unit_code: string;
  base_unit_name: string;
  is_active: boolean | null;
  valid_from: string | null;
  valid_to: string | null;
  loaded_at: string | null;
  run_id: string | null;
  actor_id: string | null;
  change_reason: string | null;
};

type CurrentLaboratoryAssignmentRow = {
  laboratory_product_id: string;
  activity_id: string;
  branch_order: number | string | null;
};

type CurrentLaboratoryRecipeLineRow = {
  line_id: string;
  laboratory_product_id: string;
  line_order: number | string | null;
  ingredient_product_id: string | null;
  ingredient_quantity_value: number | string | null;
  ingredient_quantity_reference: string | null;
  notes: string | null;
  is_active: boolean | null;
  valid_from: string | null;
  valid_to: string | null;
  loaded_at: string | null;
  run_id: string | null;
  actor_id: string | null;
  change_reason: string | null;
};

type CurrentLaboratoryCategoryRow = {
  category_id: string;
  category_code: string;
  category_name: string;
  is_active: boolean | null;
  valid_from: string | null;
  valid_to: string | null;
  loaded_at: string | null;
  run_id: string | null;
  actor_id: string | null;
  change_reason: string | null;
};

const CATEGORY_REF_TABLE = "public.lab_ref_category_id_core_scd2";
const CATEGORY_DIM_TABLE = "public.lab_dim_category_profile_scd2";
const PRODUCT_REF_TABLE = "public.lab_ref_product_id_core_scd2";
const PRODUCT_DIM_TABLE = "public.lab_dim_product_profile_scd2";
const PRODUCT_USAGE_TABLE = "public.lab_bridge_product_usage_scd2";
const PRODUCT_RECIPE_TABLE = "public.lab_bridge_product_recipe_line_scd2";

declare global {
  // eslint-disable-next-line no-var
  var __dashboardLaboratoryMastersSetup: Promise<void> | undefined;
}

function normalizeLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeCode(value: string) {
  return normalizeLabel(value).toUpperCase();
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = normalizeLabel(value ?? "");
  return normalized || null;
}

function toInt(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(parsed);
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolValue(value: boolean | null | undefined, fallback = true) {
  return value ?? fallback;
}

function formatTimestamp(value: string | null) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function makeRunId(prefix: string) {
  return `${prefix}_${new Date().toISOString()}`;
}

function makeRecordId() {
  return crypto.randomUUID();
}

function makeEntityId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function sanitizeAssignments(
  assignments: LaboratoryProductInput["assignments"],
) {
  const sanitized = assignments
    .map((assignment, index) => ({
      activityId: normalizeCode(assignment.activityId),
      branchOrder: Math.max(toInt(assignment.branchOrder, index + 1), 1),
    }))
    .filter((assignment) => assignment.activityId)
    .sort((left, right) => left.branchOrder - right.branchOrder)
    .map((assignment, index) => ({
      ...assignment,
      branchOrder: index + 1,
    }));

  const seen = new Set<string>();
  for (const assignment of sanitized) {
    const key = assignment.activityId.toLowerCase();
    if (seen.has(key)) {
      throw new Error(`La actividad "${assignment.activityId}" esta repetida.`);
    }
    seen.add(key);
  }

  return sanitized;
}

function sanitizeCategoryInput(input: LaboratoryCategoryInput) {
  const categoryCode = normalizeCode(input.categoryCode);
  const categoryName = normalizeLabel(input.categoryName);
  const changeReason = normalizeOptionalText(input.changeReason);

  if (!categoryCode) throw new Error("El codigo del tipo es obligatorio.");
  if (!categoryName) throw new Error("El nombre del tipo es obligatorio.");

  return {
    categoryCode,
    categoryName,
    isActive: boolValue(input.isActive, true),
    changeReason,
  } satisfies LaboratoryCategoryInput;
}

async function sanitizeRecipeLines(lines: LaboratoryRecipeLineInput[]) {
  const products = await listCurrentBodegaProducts();
  const productMap = new Map(products.map((product) => [product.productId, product]));

  const sanitized = lines.map((line, index) => {
    const ingredientProductId = normalizeOptionalText(line.ingredientProductId);
    const ingredientProduct = ingredientProductId ? productMap.get(ingredientProductId) ?? null : null;
    if (ingredientProductId && !ingredientProduct) {
      throw new Error("Una linea de receta referencia un producto de Bodega que ya no esta vigente.");
    }

    return {
      lineOrder: index + 1,
      ingredientProductId,
      ingredientProductCode: ingredientProduct?.productCode ?? null,
      ingredientProductName: ingredientProduct?.productName ?? null,
      ingredientUnitCode: ingredientProduct?.baseUnitCode ?? null,
      ingredientQuantityValue: toNumber(line.ingredientQuantityValue),
      ingredientQuantityReference: normalizeOptionalText(line.ingredientQuantityReference),
      notes: normalizeOptionalText(line.notes),
      isActive: boolValue(line.isActive, true),
    };
  });

  for (const line of sanitized) {
    if (!line.ingredientProductId) {
      throw new Error("Cada linea de receta debe vincularse a un producto de Bodega.");
    }
    if (line.ingredientQuantityValue === null) {
      throw new Error("Cada linea de receta debe tener cantidad del insumo.");
    }
  }

  return sanitized;
}

async function sanitizeProductInput(input: LaboratoryProductInput) {
  const productCode = normalizeCode(input.productCode);
  const productName = normalizeLabel(input.productName);
  const description = normalizeOptionalText(input.description);
  const categoryId = normalizeOptionalText(input.categoryId);
  const baseUnitId = normalizeOptionalText(input.baseUnitId);
  const assignments = sanitizeAssignments(input.assignments);
  const recipeLines = await sanitizeRecipeLines(input.recipeLines);
  const changeReason = normalizeOptionalText(input.changeReason);
  const categories = await listCurrentLaboratoryCategories();

  if (!productCode) throw new Error("El codigo del producto de laboratorio es obligatorio.");
  if (!productName) throw new Error("El nombre del producto de laboratorio es obligatorio.");
  if (!categoryId) throw new Error("El tipo del producto de laboratorio es obligatorio.");
  if (!baseUnitId) throw new Error("La unidad base es obligatoria.");
  if (!categories.some((category) => category.categoryId === categoryId && category.isActive)) {
    throw new Error("La categoria seleccionada para el producto de Laboratorio ya no esta vigente.");
  }

  return {
    productCode,
    productName,
    description,
    categoryId,
    baseUnitId,
    isActive: boolValue(input.isActive, true),
    assignments,
    recipeLines,
    changeReason,
  } satisfies LaboratoryProductInput;
}

async function ensureLaboratoryTables(client?: PoolClient) {
  const runQuery = <T extends QueryResultRow>(text: string, values: unknown[] = []) => {
    if (client) return client.query<T>(text, values);
    return queryLaboratory<T>(text, values);
  };

  await runQuery(`
    create table if not exists ${CATEGORY_REF_TABLE} (
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

  await runQuery(`
    create table if not exists ${CATEGORY_DIM_TABLE} (
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

  await runQuery(`
    create table if not exists ${PRODUCT_REF_TABLE} (
      record_id text primary key,
      laboratory_product_id text not null,
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

  await runQuery(`
    create table if not exists ${PRODUCT_DIM_TABLE} (
      record_id text primary key,
      laboratory_product_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      product_code text not null,
      product_name text not null,
      product_description text null,
      category_id text null,
      base_unit_id text not null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);

  await runQuery(`
    create table if not exists ${PRODUCT_USAGE_TABLE} (
      record_id text primary key,
      laboratory_product_id text not null,
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

  await runQuery(`
    create table if not exists ${PRODUCT_RECIPE_TABLE} (
      record_id text primary key,
      line_id text not null,
      laboratory_product_id text not null,
      valid_from timestamp without time zone not null,
      valid_to timestamp without time zone null,
      is_current boolean not null,
      line_order integer not null,
      ingredient_product_id text not null,
      ingredient_quantity_value numeric(18, 6) null,
      ingredient_quantity_reference text null,
      notes text null,
      is_active boolean not null,
      is_valid boolean not null,
      loaded_at timestamp without time zone not null,
      run_id text not null,
      actor_id text not null,
      change_reason text not null
    )
  `);

  await runQuery(`
    create unique index if not exists lab_ref_category_id_core_scd2_current_idx
      on ${CATEGORY_REF_TABLE} (category_id)
      where is_current = true
  `);

  await runQuery(`
    create unique index if not exists lab_dim_category_profile_scd2_current_idx
      on ${CATEGORY_DIM_TABLE} (category_id)
      where is_current = true
  `);

  await runQuery(`
    create unique index if not exists lab_dim_category_profile_scd2_code_idx
      on ${CATEGORY_DIM_TABLE} (upper(regexp_replace(trim(category_code), '\\s+', ' ', 'g')))
      where is_current = true and is_valid = true
  `);

  await runQuery(`
    create unique index if not exists lab_ref_product_id_core_scd2_current_idx
      on ${PRODUCT_REF_TABLE} (laboratory_product_id)
      where is_current = true
  `);

  await runQuery(`
    create unique index if not exists lab_dim_product_profile_scd2_current_idx
      on ${PRODUCT_DIM_TABLE} (laboratory_product_id)
      where is_current = true
  `);

  await runQuery(`
    create unique index if not exists lab_dim_product_profile_scd2_code_idx
      on ${PRODUCT_DIM_TABLE} (upper(regexp_replace(trim(product_code), '\\s+', ' ', 'g')))
      where is_current = true and is_valid = true
  `);

  await runQuery(`
    create index if not exists lab_bridge_product_recipe_line_scd2_current_idx
      on ${PRODUCT_RECIPE_TABLE} (laboratory_product_id, line_order)
      where is_current = true
  `);

  await runQuery(`
    alter table ${PRODUCT_DIM_TABLE}
    add column if not exists category_id text null
  `);
}

async function ensureInitialLaboratoryCategories(client?: PoolClient) {
  const runQuery = <T extends QueryResultRow>(text: string, values: unknown[] = []) => {
    if (client) return client.query<T>(text, values);
    return queryLaboratory<T>(text, values);
  };

  const existingResult = await runQuery<{ category_code: string }>(
    `select upper(trim(category_code)) as category_code from ${CATEGORY_DIM_TABLE} where is_current = true and is_valid = true`,
  );
  if (existingResult.rows.some((row) => row.category_code === "HONGOS")) {
    return;
  }

  const now = new Date();
  const runId = makeRunId("laboratory_category_seed");
  const categoryId = makeEntityId("laboratory_category");
  await runQuery(
    `
      insert into ${CATEGORY_REF_TABLE} (
        record_id, category_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
      ) values ($1, $2, $3, null, true, true, $3, $4, $5, $6)
    `,
    [makeRecordId(), categoryId, now, runId, "corex_laboratory_seed", "SEED_INITIAL_CATEGORIES"],
  );
  await runQuery(
    `
      insert into ${CATEGORY_DIM_TABLE} (
        record_id, category_id, valid_from, valid_to, is_current, category_code, category_name, is_active, is_valid, loaded_at, run_id, actor_id, change_reason
      ) values ($1, $2, $3, null, true, $4, $5, true, true, $3, $6, $7, $8)
    `,
    [makeRecordId(), categoryId, now, "HONGOS", "Hongos", runId, "corex_laboratory_seed", "SEED_INITIAL_CATEGORIES"],
  );
}

async function ensureInitialLaboratoryProducts(client?: PoolClient) {
  const runQuery = <T extends QueryResultRow>(text: string, values: unknown[] = []) => {
    if (client) return client.query<T>(text, values);
    return queryLaboratory<T>(text, values);
  };

  const units = await listCurrentBodegaUnits();
  const ccUnit = units.find((unit) => unit.code === "CC");
  if (!ccUnit) {
    throw new Error("No se encontro la unidad CC para inicializar productos de Laboratorio.");
  }
  const categoryResult = await runQuery<{ category_id: string }>(
    `select category_id from ${CATEGORY_DIM_TABLE} where is_current = true and is_valid = true and upper(trim(category_code)) = 'HONGOS' limit 1`,
  );
  const fungiCategoryId = categoryResult.rows[0]?.category_id ?? null;
  if (!fungiCategoryId) {
    throw new Error("No se encontro la categoria HONGOS para inicializar productos de Laboratorio.");
  }

  const existingResult = await runQuery<{ product_code: string }>(
    `select upper(trim(product_code)) as product_code from ${PRODUCT_DIM_TABLE} where is_current = true and is_valid = true`,
  );
  const existingCodes = new Set(existingResult.rows.map((row) => row.product_code));

  const seeds = [
    { code: "FB999", name: "TRICHODERMA" },
    { code: "FB996", name: "PAECILOMYCES" },
    { code: "FB998", name: "BEAUVERIA" },
  ].filter((seed) => !existingCodes.has(seed.code));

  if (!seeds.length) return;

  const now = new Date();
  const runId = makeRunId("laboratory_seed");
  for (const seed of seeds) {
    const laboratoryProductId = makeEntityId("laboratory_product");
    await runQuery(
      `
        insert into ${PRODUCT_REF_TABLE} (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $3, $4, $5, $6)
      `,
      [makeRecordId(), laboratoryProductId, now, runId, "corex_laboratory_seed", "SEED_INITIAL_PRODUCTS"],
    );
    await runQuery(
      `
        insert into ${PRODUCT_DIM_TABLE} (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, product_code, product_name,
          product_description, category_id, base_unit_id, is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, null, $6, $7, true, true, $3, $8, $9, $10)
      `,
      [
        makeRecordId(),
        laboratoryProductId,
        now,
        seed.code,
        seed.name,
        fungiCategoryId,
        ccUnit.unitId,
        runId,
        "corex_laboratory_seed",
        "SEED_INITIAL_PRODUCTS",
      ],
    );
    await runQuery(
      `
        insert into ${PRODUCT_USAGE_TABLE} (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, branch_order, activity_id,
          is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, 1, $4, true, $3, $5, $6, $7)
      `,
      [makeRecordId(), laboratoryProductId, now, DRENCH_PROGRAM_ACTIVITY_ID, runId, "corex_laboratory_seed", "SEED_INITIAL_PRODUCTS"],
    );
  }
}

async function initializeLaboratoryMastersInternal(client?: PoolClient) {
  await ensureLaboratoryTables(client);
  await ensureInitialLaboratoryCategories(client);
  await ensureInitialLaboratoryProducts(client);
  const runQuery = <T extends QueryResultRow>(text: string, values: unknown[] = []) => {
    if (client) return client.query<T>(text, values);
    return queryLaboratory<T>(text, values);
  };
  const categoryResult = await runQuery<{ category_id: string }>(
    `select category_id from ${CATEGORY_DIM_TABLE} where is_current = true and is_valid = true and upper(trim(category_code)) = 'HONGOS' limit 1`,
  );
  const fungiCategoryId = categoryResult.rows[0]?.category_id ?? null;
  if (fungiCategoryId) {
    await runQuery(
      `update ${PRODUCT_DIM_TABLE} set category_id = $1 where is_current = true and category_id is null`,
      [fungiCategoryId],
    );
  }
}

export async function initializeLaboratoryMasters() {
  if (!global.__dashboardLaboratoryMastersSetup) {
    global.__dashboardLaboratoryMastersSetup = initializeLaboratoryMastersInternal();
  }
  await global.__dashboardLaboratoryMastersSetup;
}

export async function listCurrentLaboratoryCategories() {
  await initializeLaboratoryMasters();
  const result = await queryLaboratory<CurrentLaboratoryCategoryRow>(
    `
      select
        category_id,
        category_code,
        category_name,
        is_active,
        valid_from,
        valid_to,
        loaded_at,
        run_id,
        actor_id,
        change_reason
      from ${CATEGORY_DIM_TABLE}
      where is_current = true
      order by upper(category_code) asc
    `,
  );

  return result.rows.map<LaboratoryCategoryRecord>((row) => ({
    categoryId: row.category_id,
    categoryCode: row.category_code,
    categoryName: row.category_name,
    isActive: boolValue(row.is_active, true),
    validFrom: formatTimestamp(row.valid_from),
    validTo: formatTimestamp(row.valid_to),
    loadedAt: formatTimestamp(row.loaded_at),
    runId: row.run_id,
    actorId: row.actor_id,
    changeReason: row.change_reason,
  }));
}

async function getCurrentLaboratoryCategoryById(categoryId: string) {
  const categories = await listCurrentLaboratoryCategories();
  return categories.find((category) => category.categoryId === categoryId) ?? null;
}

export async function createLaboratoryCategory(input: LaboratoryCategoryInput, actorId: string) {
  await initializeLaboratoryMasters();
  const sanitized = sanitizeCategoryInput(input);
  const currentCategories = await listCurrentLaboratoryCategories();
  if (currentCategories.some((category) => category.categoryCode === sanitized.categoryCode)) {
    throw new Error(`Ya existe un tipo de Laboratorio con codigo "${sanitized.categoryCode}".`);
  }

  const categoryId = makeEntityId("laboratory_category");
  const now = new Date();
  const runId = makeRunId("laboratory_category_create");
  const changeReason = sanitized.changeReason ?? "CREATE_FROM_COREX_UI";

  await withLaboratoryTransaction(async (client) => {
    await initializeLaboratoryMastersInternal(client);

    await client.query(
      `
        insert into ${CATEGORY_REF_TABLE} (
          record_id, category_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $3, $4, $5, $6)
      `,
      [makeRecordId(), categoryId, now, runId, actorId, changeReason],
    );

    await client.query(
      `
        insert into ${CATEGORY_DIM_TABLE} (
          record_id, category_id, valid_from, valid_to, is_current, category_code, category_name,
          is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, $6, true, $3, $7, $8, $9)
      `,
      [
        makeRecordId(),
        categoryId,
        now,
        sanitized.categoryCode,
        sanitized.categoryName,
        sanitized.isActive,
        runId,
        actorId,
        changeReason,
      ],
    );
  });

  return getCurrentLaboratoryCategoryById(categoryId);
}

export async function updateLaboratoryCategory(categoryId: string, input: LaboratoryCategoryInput, actorId: string) {
  await initializeLaboratoryMasters();
  const current = await getCurrentLaboratoryCategoryById(categoryId);
  if (!current) {
    throw new Error("No se encontro el tipo de Laboratorio que intentas editar.");
  }

  const sanitized = sanitizeCategoryInput(input);
  const currentCategories = await listCurrentLaboratoryCategories();
  if (currentCategories.some((category) => category.categoryCode === sanitized.categoryCode && category.categoryId !== categoryId)) {
    throw new Error(`Ya existe otro tipo de Laboratorio con codigo "${sanitized.categoryCode}".`);
  }

  const now = new Date();
  const runId = makeRunId("laboratory_category_update");
  const changeReason = sanitized.changeReason ?? "UPDATE_FROM_COREX_UI";

  await withLaboratoryTransaction(async (client) => {
    await initializeLaboratoryMastersInternal(client);

    await client.query(
      `update ${CATEGORY_REF_TABLE} set is_current = false, valid_to = $2 where category_id = $1 and is_current = true`,
      [categoryId, now],
    );
    await client.query(
      `update ${CATEGORY_DIM_TABLE} set is_current = false, valid_to = $2 where category_id = $1 and is_current = true`,
      [categoryId, now],
    );

    await client.query(
      `
        insert into ${CATEGORY_REF_TABLE} (
          record_id, category_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $3, $4, $5, $6)
      `,
      [makeRecordId(), categoryId, now, runId, actorId, changeReason],
    );

    await client.query(
      `
        insert into ${CATEGORY_DIM_TABLE} (
          record_id, category_id, valid_from, valid_to, is_current, category_code, category_name,
          is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, $6, true, $3, $7, $8, $9)
      `,
      [
        makeRecordId(),
        categoryId,
        now,
        sanitized.categoryCode,
        sanitized.categoryName,
        sanitized.isActive,
        runId,
        actorId,
        changeReason,
      ],
    );
  });

  return getCurrentLaboratoryCategoryById(categoryId);
}

function mapRecipeLines(
  rows: CurrentLaboratoryRecipeLineRow[],
  bodegaProducts: Awaited<ReturnType<typeof listCurrentBodegaProducts>>,
) {
  const productMap = new Map(bodegaProducts.map((product) => [product.productId, product]));
  const grouped = new Map<string, LaboratoryRecipeLineRecord[]>();

  for (const row of rows) {
    const ingredient = row.ingredient_product_id ? productMap.get(row.ingredient_product_id) ?? null : null;
    const line: LaboratoryRecipeLineRecord = {
      lineId: row.line_id,
      lineOrder: Number(row.line_order ?? 0),
      ingredientProductId: row.ingredient_product_id,
      ingredientProductCode: ingredient?.productCode ?? null,
      ingredientProductName: ingredient?.productName ?? null,
      ingredientUnitCode: ingredient?.baseUnitCode ?? null,
      ingredientQuantityValue: toNumber(row.ingredient_quantity_value),
      ingredientQuantityReference: row.ingredient_quantity_reference,
      notes: row.notes,
      isActive: boolValue(row.is_active, true),
      validFrom: formatTimestamp(row.valid_from),
      validTo: formatTimestamp(row.valid_to),
      loadedAt: formatTimestamp(row.loaded_at),
      runId: row.run_id,
      actorId: row.actor_id,
      changeReason: row.change_reason,
    };
    const items = grouped.get(row.laboratory_product_id) ?? [];
    items.push(line);
    grouped.set(row.laboratory_product_id, items);
  }

  return grouped;
}

export async function listCurrentLaboratoryProducts() {
  await initializeLaboratoryMasters();

  const [productsResult, assignmentsResult, recipeResult, bodegaProducts, units] = await Promise.all([
    queryLaboratory<CurrentLaboratoryProductRow>(
      `
        select
          dim.laboratory_product_id,
          dim.product_code,
          dim.product_name,
          dim.product_description,
          dim.category_id,
          category.category_code,
          category.category_name,
          dim.base_unit_id,
          null::text as base_unit_code,
          null::text as base_unit_name,
          dim.is_active,
          dim.valid_from,
          dim.valid_to,
          dim.loaded_at,
          dim.run_id,
          dim.actor_id,
          dim.change_reason
        from ${PRODUCT_DIM_TABLE} dim
        left join ${CATEGORY_DIM_TABLE} category
          on category.category_id = dim.category_id
         and category.is_current = true
        where dim.is_current = true
        order by upper(dim.product_code) asc
      `,
    ),
    queryLaboratory<CurrentLaboratoryAssignmentRow>(
      `
        select laboratory_product_id, activity_id, branch_order
        from ${PRODUCT_USAGE_TABLE}
        where is_current = true
        order by laboratory_product_id asc, branch_order asc
      `,
    ),
    queryLaboratory<CurrentLaboratoryRecipeLineRow>(
      `
        select
          line_id,
          laboratory_product_id,
          line_order,
          ingredient_product_id,
          ingredient_quantity_value,
          ingredient_quantity_reference,
          notes,
          is_active,
          valid_from,
          valid_to,
          loaded_at,
          run_id,
          actor_id,
          change_reason
        from ${PRODUCT_RECIPE_TABLE}
        where is_current = true
        order by laboratory_product_id asc, line_order asc
      `,
    ),
    listCurrentBodegaProducts(),
    listCurrentBodegaUnits(),
  ]);

  const activityIds = [...new Set(assignmentsResult.rows.map((row) => normalizeCode(row.activity_id)))];
  const activityMap = await getCurrentBodegaSourceActivitiesById(activityIds);
  const recipeMap = mapRecipeLines(recipeResult.rows, bodegaProducts);
  const unitMap = new Map(units.map((unit) => [unit.unitId, unit]));
  const assignmentMap = new Map<string, LaboratoryProductRecord["assignments"]>();

  for (const row of assignmentsResult.rows) {
    const items = assignmentMap.get(row.laboratory_product_id) ?? [];
    const activity = activityMap.get(normalizeCode(row.activity_id));
    items.push({
      activityId: normalizeCode(row.activity_id),
      activityName: activity?.activityName ?? normalizeCode(row.activity_id),
      costArea: activity?.costArea ?? null,
      subCostCenter: activity?.subCostCenter ?? null,
      activityType: activity?.activityType ?? null,
      branchOrder: Number(row.branch_order ?? 0),
      usageLabel: activity
        ? [activity.costArea, activity.subCostCenter, `${activity.activityName} (${activity.activityId})`]
          .filter(Boolean)
          .join(" / ")
        : normalizeCode(row.activity_id),
    });
    assignmentMap.set(row.laboratory_product_id, items);
  }

  return productsResult.rows.map<LaboratoryProductRecord>((row) => ({
    laboratoryProductId: row.laboratory_product_id,
    productCode: row.product_code,
    productName: row.product_name,
    description: row.product_description,
    categoryId: row.category_id,
    categoryCode: row.category_code ?? "",
    categoryName: row.category_name ?? "",
    baseUnitId: row.base_unit_id,
    baseUnitCode: unitMap.get(row.base_unit_id)?.code ?? row.base_unit_code,
    baseUnitName: unitMap.get(row.base_unit_id)?.name ?? row.base_unit_name,
    isActive: boolValue(row.is_active, true),
    assignments: assignmentMap.get(row.laboratory_product_id) ?? [],
    recipeLines: recipeMap.get(row.laboratory_product_id) ?? [],
    validFrom: formatTimestamp(row.valid_from),
    validTo: formatTimestamp(row.valid_to),
    loadedAt: formatTimestamp(row.loaded_at),
    runId: row.run_id,
    actorId: row.actor_id,
    changeReason: row.change_reason,
  }));
}

export async function listCurrentLaboratoryAssignableProducts(activityId?: string) {
  const normalizedActivityId = normalizeCode(activityId ?? DRENCH_PROGRAM_ACTIVITY_ID);
  const products = await listCurrentLaboratoryProducts();
  return products
    .filter((product) => product.isActive && product.assignments.some((assignment) => assignment.activityId === normalizedActivityId))
    .sort((left, right) => left.productCode.localeCompare(right.productCode));
}

async function getCurrentLaboratoryProductById(laboratoryProductId: string) {
  const products = await listCurrentLaboratoryProducts();
  return products.find((product) => product.laboratoryProductId === laboratoryProductId) ?? null;
}

export async function createLaboratoryProduct(input: LaboratoryProductInput, actorId: string) {
  await initializeLaboratoryMasters();
  const sanitized = await sanitizeProductInput(input);
  const currentProducts = await listCurrentLaboratoryProducts();
  if (currentProducts.some((product) => product.productCode === sanitized.productCode)) {
    throw new Error(`Ya existe un producto de Laboratorio con codigo "${sanitized.productCode}".`);
  }

  const laboratoryProductId = makeEntityId("laboratory_product");
  const now = new Date();
  const runId = makeRunId("laboratory_create");
  const changeReason = sanitized.changeReason ?? "CREATE_FROM_COREX_UI";

  await withLaboratoryTransaction(async (client) => {
    await initializeLaboratoryMastersInternal(client);

    await client.query(
      `
        insert into ${PRODUCT_REF_TABLE} (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $3, $4, $5, $6)
      `,
      [makeRecordId(), laboratoryProductId, now, runId, actorId, changeReason],
    );

    await client.query(
      `
        insert into ${PRODUCT_DIM_TABLE} (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, product_code, product_name,
          product_description, category_id, base_unit_id, is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, $6, $7, $8, $9, true, $3, $10, $11, $12)
      `,
      [
        makeRecordId(),
        laboratoryProductId,
        now,
        sanitized.productCode,
        sanitized.productName,
        sanitized.description,
        sanitized.categoryId,
        sanitized.baseUnitId,
        sanitized.isActive,
        runId,
        actorId,
        changeReason,
      ],
    );

    for (const assignment of sanitized.assignments) {
      await client.query(
        `
          insert into ${PRODUCT_USAGE_TABLE} (
            record_id, laboratory_product_id, valid_from, valid_to, is_current, branch_order, activity_id,
            is_valid, loaded_at, run_id, actor_id, change_reason
          ) values ($1, $2, $3, null, true, $4, $5, true, $3, $6, $7, $8)
        `,
        [makeRecordId(), laboratoryProductId, now, assignment.branchOrder, assignment.activityId, runId, actorId, changeReason],
      );
    }

    for (const line of sanitized.recipeLines) {
      await client.query(
        `
          insert into ${PRODUCT_RECIPE_TABLE} (
            record_id, line_id, laboratory_product_id, valid_from, valid_to, is_current, line_order,
            ingredient_product_id, ingredient_quantity_value, ingredient_quantity_reference, notes, is_active,
            is_valid, loaded_at, run_id, actor_id, change_reason
          ) values ($1, $2, $3, $4, null, true, $5, $6, $7, $8, $9, $10, true, $4, $11, $12, $13)
        `,
        [
          makeRecordId(),
          makeEntityId("laboratory_recipe_line"),
          laboratoryProductId,
          now,
          line.lineOrder,
          line.ingredientProductId,
          line.ingredientQuantityValue,
          line.ingredientQuantityReference,
          line.notes,
          line.isActive,
          runId,
          actorId,
          changeReason,
        ],
      );
    }
  });

  return getCurrentLaboratoryProductById(laboratoryProductId);
}

export async function updateLaboratoryProduct(laboratoryProductId: string, input: LaboratoryProductInput, actorId: string) {
  await initializeLaboratoryMasters();
  const current = await getCurrentLaboratoryProductById(laboratoryProductId);
  if (!current) {
    throw new Error("No se encontro el producto de Laboratorio que intentas editar.");
  }

  const sanitized = await sanitizeProductInput(input);
  const currentProducts = await listCurrentLaboratoryProducts();
  if (currentProducts.some((product) => product.productCode === sanitized.productCode && product.laboratoryProductId !== laboratoryProductId)) {
    throw new Error(`Ya existe otro producto de Laboratorio con codigo "${sanitized.productCode}".`);
  }

  const now = new Date();
  const runId = makeRunId("laboratory_update");
  const changeReason = sanitized.changeReason ?? "UPDATE_FROM_COREX_UI";

  await withLaboratoryTransaction(async (client) => {
    await initializeLaboratoryMastersInternal(client);

    await client.query(
      `update ${PRODUCT_REF_TABLE} set is_current = false, valid_to = $2 where laboratory_product_id = $1 and is_current = true`,
      [laboratoryProductId, now],
    );
    await client.query(
      `update ${PRODUCT_DIM_TABLE} set is_current = false, valid_to = $2 where laboratory_product_id = $1 and is_current = true`,
      [laboratoryProductId, now],
    );
    await client.query(
      `update ${PRODUCT_USAGE_TABLE} set is_current = false, valid_to = $2 where laboratory_product_id = $1 and is_current = true`,
      [laboratoryProductId, now],
    );
    await client.query(
      `update ${PRODUCT_RECIPE_TABLE} set is_current = false, valid_to = $2 where laboratory_product_id = $1 and is_current = true`,
      [laboratoryProductId, now],
    );

    await client.query(
      `
        insert into ${PRODUCT_REF_TABLE} (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, true, $3, $4, $5, $6)
      `,
      [makeRecordId(), laboratoryProductId, now, runId, actorId, changeReason],
    );
    await client.query(
      `
        insert into ${PRODUCT_DIM_TABLE} (
          record_id, laboratory_product_id, valid_from, valid_to, is_current, product_code, product_name,
          product_description, category_id, base_unit_id, is_active, is_valid, loaded_at, run_id, actor_id, change_reason
        ) values ($1, $2, $3, null, true, $4, $5, $6, $7, $8, $9, true, $3, $10, $11, $12)
      `,
      [
        makeRecordId(),
        laboratoryProductId,
        now,
        sanitized.productCode,
        sanitized.productName,
        sanitized.description,
        sanitized.categoryId,
        sanitized.baseUnitId,
        sanitized.isActive,
        runId,
        actorId,
        changeReason,
      ],
    );

    for (const assignment of sanitized.assignments) {
      await client.query(
        `
          insert into ${PRODUCT_USAGE_TABLE} (
            record_id, laboratory_product_id, valid_from, valid_to, is_current, branch_order, activity_id,
            is_valid, loaded_at, run_id, actor_id, change_reason
          ) values ($1, $2, $3, null, true, $4, $5, true, $3, $6, $7, $8)
        `,
        [makeRecordId(), laboratoryProductId, now, assignment.branchOrder, assignment.activityId, runId, actorId, changeReason],
      );
    }

    for (const line of sanitized.recipeLines) {
      await client.query(
        `
          insert into ${PRODUCT_RECIPE_TABLE} (
            record_id, line_id, laboratory_product_id, valid_from, valid_to, is_current, line_order,
            ingredient_product_id, ingredient_quantity_value, ingredient_quantity_reference, notes, is_active,
            is_valid, loaded_at, run_id, actor_id, change_reason
          ) values ($1, $2, $3, $4, null, true, $5, $6, $7, $8, $9, $10, true, $4, $11, $12, $13)
        `,
        [
          makeRecordId(),
          makeEntityId("laboratory_recipe_line"),
          laboratoryProductId,
          now,
          line.lineOrder,
          line.ingredientProductId,
          line.ingredientQuantityValue,
          line.ingredientQuantityReference,
          line.notes,
          line.isActive,
          runId,
          actorId,
          changeReason,
        ],
      );
    }
  });

  return getCurrentLaboratoryProductById(laboratoryProductId);
}

export async function getCurrentLaboratorySummary() {
  await initializeLaboratoryMasters();
  const [products, lines] = await Promise.all([
    queryLaboratory<LaboratoryCountRow>(`select count(*)::int as total from ${PRODUCT_DIM_TABLE} where is_current = true`),
    queryLaboratory<LaboratoryCountRow>(`select count(*)::int as total from ${PRODUCT_RECIPE_TABLE} where is_current = true`),
  ]);

  return {
    products: Number(products.rows[0]?.total ?? 0),
    recipeLines: Number(lines.rows[0]?.total ?? 0),
  };
}

