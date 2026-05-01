import crypto from "node:crypto";

import { queryHumanTalent, withHumanTalentTransaction } from "@/lib/human-talent-db";

export type TthhCatalogGroup = {
  catalogCode: string;
  catalogName: string;
  catalogDescription: string | null;
  domainCode: string;
  isValid: boolean;
};

export type TthhCatalogDomain = {
  domainCode: string;
  domainName: string;
  domainDescription: string | null;
  moduleCode: string;
  displayOrder: number;
  isValid: boolean;
};

export type TthhCatalogItem = {
  catalogCode: string;
  itemCode: string;
  itemLabelEs: string;
  itemDescription: string | null;
  displayOrder: number;
  isValid: boolean;
};

const DOMAIN_TABLE = "public.common_dim_catalog_domain_profile_cur";
const GROUP_CORE_TABLE = "public.common_ref_catalog_group_id_core_scd2";
const GROUP_PROFILE_TABLE = "public.common_dim_catalog_group_profile_scd2";
const ITEM_CORE_TABLE = "public.common_ref_catalog_item_id_core_scd2";
const ITEM_PROFILE_TABLE = "public.common_dim_catalog_item_profile_scd2";
const RUN_ID = "corex_admin_catalogs";

export async function listTthhCatalogs() {
  const [domains, groups, items] = await Promise.all([
    queryHumanTalent<TthhCatalogDomain & {
      domain_code: string;
      domain_name: string;
      domain_description: string | null;
      module_code: string;
      display_order: number;
      is_valid: boolean;
    }>(`
      SELECT domain_code, domain_name, domain_description, module_code, display_order, is_valid
      FROM ${DOMAIN_TABLE}
      ORDER BY display_order, domain_name
    `),
    queryHumanTalent<TthhCatalogGroup & {
      catalog_code: string;
      catalog_name: string;
      catalog_description: string | null;
      domain_code: string;
      is_valid: boolean;
    }>(`
      SELECT catalog_code, catalog_name, catalog_description, domain_code, is_valid
      FROM ${GROUP_PROFILE_TABLE}
      WHERE is_current = true
      ORDER BY domain_code, catalog_code
    `),
    queryHumanTalent<TthhCatalogItem & {
      catalog_code: string;
      item_code: string;
      item_label_es: string;
      item_description: string | null;
      display_order: number;
      is_valid: boolean;
    }>(`
      SELECT catalog_code, item_code, item_label_es, item_description, display_order, is_valid
      FROM ${ITEM_PROFILE_TABLE}
      WHERE is_current = true
      ORDER BY catalog_code, display_order, item_label_es
    `),
  ]);

  return {
    domains: domains.rows.map((row) => ({
      domainCode: row.domain_code,
      domainName: row.domain_name,
      domainDescription: row.domain_description,
      moduleCode: row.module_code,
      displayOrder: row.display_order,
      isValid: row.is_valid,
    })),
    groups: groups.rows.map((row) => ({
      catalogCode: row.catalog_code,
      catalogName: row.catalog_name,
      catalogDescription: row.catalog_description,
      domainCode: row.domain_code,
      isValid: row.is_valid,
    })),
    items: items.rows.map((row) => ({
      catalogCode: row.catalog_code,
      itemCode: row.item_code,
      itemLabelEs: row.item_label_es,
      itemDescription: row.item_description,
      displayOrder: row.display_order,
      isValid: row.is_valid,
    })),
  };
}

export async function upsertTthhCatalogDomain(input: {
  domainCode: string;
  domainName: string;
  domainDescription?: string | null;
  moduleCode?: string;
  displayOrder?: number;
  isValid?: boolean;
  actorId?: string;
}) {
  await queryHumanTalent(
    `
    INSERT INTO ${DOMAIN_TABLE} (
      domain_code, domain_name, domain_description, module_code, display_order, is_valid, run_id, actor_id, change_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual_update')
    ON CONFLICT (domain_code)
    DO UPDATE SET
      domain_name = EXCLUDED.domain_name,
      domain_description = EXCLUDED.domain_description,
      module_code = EXCLUDED.module_code,
      display_order = EXCLUDED.display_order,
      is_valid = EXCLUDED.is_valid,
      loaded_at = now(),
      actor_id = EXCLUDED.actor_id,
      change_reason = 'manual_update'
    `,
    [
      input.domainCode,
      input.domainName,
      input.domainDescription ?? null,
      input.moduleCode ?? "tthh",
      input.displayOrder ?? 0,
      input.isValid ?? true,
      RUN_ID,
      input.actorId ?? null,
    ],
  );
}

export async function upsertTthhCatalogGroup(input: {
  catalogCode: string;
  catalogName: string;
  catalogDescription?: string | null;
  domainCode?: string;
  isValid?: boolean;
  actorId?: string;
}) {
  await withHumanTalentTransaction(async (client) => {
    const actor = input.actorId ?? null;

    await client.query(
      `UPDATE ${GROUP_CORE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $2, change_reason = 'manual_update'
       WHERE catalog_code = $1 AND is_current = true AND is_valid = true`,
      [input.catalogCode, actor],
    );
    await client.query(
      `UPDATE ${GROUP_PROFILE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $2, change_reason = 'manual_update'
       WHERE catalog_code = $1 AND is_current = true AND is_valid = true`,
      [input.catalogCode, actor],
    );

    await client.query(
      `INSERT INTO ${GROUP_CORE_TABLE}
        (record_id, catalog_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, now(), true, true, $3, $4, 'manual_update')`,
      [crypto.randomUUID(), input.catalogCode, RUN_ID, actor],
    );
    await client.query(
      `INSERT INTO ${GROUP_PROFILE_TABLE}
        (record_id, catalog_code, catalog_name, catalog_description, module_code, domain_code, is_valid,
         valid_from, is_current, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, 'tthh_followups', $5, $6, now(), true, $7, $8, 'manual_update')`,
      [
        crypto.randomUUID(),
        input.catalogCode,
        input.catalogName,
        input.catalogDescription ?? null,
        input.domainCode ?? "seguimiento_trabajo_social",
        input.isValid ?? true,
        RUN_ID,
        actor,
      ],
    );
  });
}

export async function upsertTthhCatalogItem(input: {
  catalogCode: string;
  itemCode: string;
  itemLabelEs: string;
  itemDescription?: string | null;
  displayOrder?: number;
  isValid?: boolean;
  actorId?: string;
}) {
  await withHumanTalentTransaction(async (client) => {
    const actor = input.actorId ?? null;

    await client.query(
      `UPDATE ${ITEM_CORE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $3, change_reason = 'manual_update'
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true AND is_valid = true`,
      [input.catalogCode, input.itemCode, actor],
    );
    await client.query(
      `UPDATE ${ITEM_PROFILE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $3, change_reason = 'manual_update'
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true AND is_valid = true`,
      [input.catalogCode, input.itemCode, actor],
    );

    await client.query(
      `INSERT INTO ${ITEM_CORE_TABLE}
        (record_id, catalog_code, item_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, now(), true, true, $4, $5, 'manual_update')`,
      [crypto.randomUUID(), input.catalogCode, input.itemCode, RUN_ID, actor],
    );
    await client.query(
      `INSERT INTO ${ITEM_PROFILE_TABLE}
        (record_id, catalog_code, item_code, item_label_es, item_description, display_order, is_valid,
         valid_from, is_current, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), true, $8, $9, 'manual_update')`,
      [
        crypto.randomUUID(),
        input.catalogCode,
        input.itemCode,
        input.itemLabelEs,
        input.itemDescription ?? null,
        input.displayOrder ?? 0,
        input.isValid ?? true,
        RUN_ID,
        actor,
      ],
    );
  });
}

export async function setTthhCatalogValidity(kind: "domain" | "group" | "item", input: {
  catalogCode: string;
  itemCode?: string;
  domainCode?: string;
  isValid: boolean;
  actorId?: string;
}) {
  if (kind === "domain") {
    await queryHumanTalent(
      `UPDATE ${DOMAIN_TABLE}
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = 'manual_update'
       WHERE domain_code = $1`,
      [input.domainCode, input.isValid, input.actorId ?? null],
    );
    return;
  }
  if (kind === "group") {
    await withHumanTalentTransaction(async (client) => {
      await client.query(
        `UPDATE ${GROUP_CORE_TABLE}
         SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = 'manual_update'
         WHERE catalog_code = $1 AND is_current = true`,
        [input.catalogCode, input.isValid, input.actorId ?? null],
      );
      await client.query(
        `UPDATE ${GROUP_PROFILE_TABLE}
         SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = 'manual_update'
         WHERE catalog_code = $1 AND is_current = true`,
        [input.catalogCode, input.isValid, input.actorId ?? null],
      );
    });
    return;
  }

  await withHumanTalentTransaction(async (client) => {
    await client.query(
      `UPDATE ${ITEM_CORE_TABLE}
       SET is_valid = $3, loaded_at = now(), actor_id = $4, change_reason = 'manual_update'
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true`,
      [input.catalogCode, input.itemCode, input.isValid, input.actorId ?? null],
    );
    await client.query(
      `UPDATE ${ITEM_PROFILE_TABLE}
       SET is_valid = $3, loaded_at = now(), actor_id = $4, change_reason = 'manual_update'
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true`,
      [input.catalogCode, input.itemCode, input.isValid, input.actorId ?? null],
    );
  });
}
