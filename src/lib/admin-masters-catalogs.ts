import crypto from "node:crypto";

import { queryAdmin, withAdminTransaction } from "@/lib/admin-db";

export type AdminCatalogDomain = {
  domainCode: string;
  domainName: string;
  domainDescription: string | null;
  displayOrder: number;
  isValid: boolean;
};

export type AdminCatalogGroup = {
  catalogCode: string;
  catalogName: string;
  catalogDescription: string | null;
  domainCode: string;
  isSystemCatalog: boolean;
  validFrom: string;
  validTo: string | null;
};

export type AdminCatalogItem = {
  catalogCode: string;
  itemCode: string;
  itemLabelEs: string;
  itemLabelEn: string | null;
  itemDescription: string | null;
  displayOrder: number;
  validFrom: string;
  validTo: string | null;
};

export type AdminCatalogPayload = {
  domains: AdminCatalogDomain[];
  groups: AdminCatalogGroup[];
  items: AdminCatalogItem[];
};

type DomainRow = {
  domain_code: string;
  domain_name: string;
  domain_description: string | null;
  display_order: number | string;
  is_valid: boolean;
};

type GroupRow = {
  catalog_code: string;
  catalog_name: string;
  catalog_description: string | null;
  domain_code: string;
  is_system_catalog: boolean;
  valid_from: Date | string;
  valid_to: Date | string | null;
};

type ItemRow = {
  catalog_code: string;
  item_code: string;
  item_label_es: string;
  item_label_en: string | null;
  item_description: string | null;
  display_order: number | string;
  valid_from: Date | string;
  valid_to: Date | string | null;
};

const DOMAIN_TABLE = "public.adm_dim_catalog_domain_profile_cur";
const GROUP_CORE_TABLE = "public.adm_ref_catalog_group_id_core_scd2";
const GROUP_PROFILE_TABLE = "public.adm_dim_catalog_group_profile_scd2";
const ITEM_CORE_TABLE = "public.adm_ref_catalog_item_id_core_scd2";
const ITEM_PROFILE_TABLE = "public.adm_dim_catalog_item_profile_scd2";

const RUN_ID = "corex_admin_masters";

function toIsoDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function toIsoDateOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIsoDate(value);
}

export async function loadAdminCatalogs(): Promise<AdminCatalogPayload> {
  try {
    const [domains, groups, items] = await Promise.all([
      queryAdmin<DomainRow>(
        `SELECT domain_code, domain_name, domain_description, display_order, is_valid
         FROM ${DOMAIN_TABLE}
         ORDER BY display_order, domain_code`,
      ),
      queryAdmin<GroupRow>(
        `SELECT catalog_code, catalog_name, catalog_description, domain_code, is_system_catalog, valid_from, valid_to
         FROM ${GROUP_PROFILE_TABLE}
         WHERE is_current = true AND is_valid = true
         ORDER BY domain_code, catalog_code`,
      ),
      queryAdmin<ItemRow>(
        `SELECT catalog_code, item_code, item_label_es, item_label_en, item_description, display_order, valid_from, valid_to
         FROM ${ITEM_PROFILE_TABLE}
         WHERE is_current = true AND is_valid = true
         ORDER BY catalog_code, display_order, item_code`,
      ),
    ]);

    return {
      domains: domains.rows.map((r) => ({
        domainCode: r.domain_code,
        domainName: r.domain_name,
        domainDescription: r.domain_description,
        displayOrder: Number(r.display_order),
        isValid: r.is_valid,
      })),
      groups: groups.rows.map((r) => ({
        catalogCode: r.catalog_code,
        catalogName: r.catalog_name,
        catalogDescription: r.catalog_description,
        domainCode: r.domain_code,
        isSystemCatalog: r.is_system_catalog,
        validFrom: toIsoDate(r.valid_from),
        validTo: toIsoDateOrNull(r.valid_to),
      })),
      items: items.rows.map((r) => ({
        catalogCode: r.catalog_code,
        itemCode: r.item_code,
        itemLabelEs: r.item_label_es,
        itemLabelEn: r.item_label_en,
        itemDescription: r.item_description,
        displayOrder: Number(r.display_order),
        validFrom: toIsoDate(r.valid_from),
        validTo: toIsoDateOrNull(r.valid_to),
      })),
    };
  } catch {
    return { domains: [], groups: [], items: [] };
  }
}

// ===== DOMINIOS (cur table - sin SCD2, simple upsert) =====

export type UpsertDomainInput = {
  domainCode: string;
  domainName: string;
  domainDescription?: string | null;
  displayOrder?: number;
  isValid?: boolean;
  actorId?: string;
  changeReason?: string;
};

export async function upsertAdminDomain(input: UpsertDomainInput): Promise<void> {
  await queryAdmin(
    `
    INSERT INTO ${DOMAIN_TABLE}
      (domain_code, domain_name, domain_description, display_order, is_valid, run_id, actor_id, change_reason)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (domain_code) DO UPDATE SET
      domain_name = EXCLUDED.domain_name,
      domain_description = EXCLUDED.domain_description,
      display_order = EXCLUDED.display_order,
      is_valid = EXCLUDED.is_valid,
      loaded_at = now(),
      actor_id = EXCLUDED.actor_id,
      change_reason = EXCLUDED.change_reason
    `,
    [
      input.domainCode,
      input.domainName,
      input.domainDescription ?? null,
      input.displayOrder ?? 0,
      input.isValid ?? true,
      RUN_ID,
      input.actorId ?? null,
      input.changeReason ?? "manual_update",
    ],
  );
}

export async function setAdminDomainValidity(
  domainCode: string,
  isValid: boolean,
  actorId: string | null,
  changeReason: string = "manual_update",
): Promise<void> {
  await queryAdmin(
    `UPDATE ${DOMAIN_TABLE}
     SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
     WHERE domain_code = $1`,
    [domainCode, isValid, actorId, changeReason],
  );
}

// ===== GRUPOS DE CATALOGO (SCD2: core + profile) =====

export type UpsertGroupInput = {
  catalogCode: string;
  catalogName: string;
  catalogDescription?: string | null;
  domainCode: string;
  isSystemCatalog?: boolean;
  actorId?: string;
  changeReason?: string;
};

export async function upsertAdminCatalogGroup(input: UpsertGroupInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    const actor = input.actorId ?? null;
    const reason = input.changeReason ?? "manual_update";

    await client.query(
      `UPDATE ${GROUP_CORE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $2, change_reason = $3
       WHERE catalog_code = $1 AND is_current = true AND is_valid = true`,
      [input.catalogCode, actor, reason],
    );
    await client.query(
      `UPDATE ${GROUP_PROFILE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $2, change_reason = $3
       WHERE catalog_code = $1 AND is_current = true AND is_valid = true`,
      [input.catalogCode, actor, reason],
    );

    await client.query(
      `INSERT INTO ${GROUP_CORE_TABLE}
        (record_id, catalog_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, now(), true, true, $3, $4, $5)`,
      [crypto.randomUUID(), input.catalogCode, RUN_ID, actor, reason],
    );
    await client.query(
      `INSERT INTO ${GROUP_PROFILE_TABLE}
        (record_id, catalog_code, catalog_name, catalog_description, domain_code, is_system_catalog,
         valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, now(), true, true, $7, $8, $9)`,
      [
        crypto.randomUUID(),
        input.catalogCode,
        input.catalogName,
        input.catalogDescription ?? null,
        input.domainCode,
        input.isSystemCatalog ?? false,
        RUN_ID,
        actor,
        reason,
      ],
    );
  });
}

export async function setAdminCatalogGroupValidity(
  catalogCode: string,
  isValid: boolean,
  actorId: string | null,
  changeReason: string = "manual_update",
): Promise<void> {
  await withAdminTransaction(async (client) => {
    await client.query(
      `UPDATE ${GROUP_CORE_TABLE}
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE catalog_code = $1 AND is_current = true`,
      [catalogCode, isValid, actorId, changeReason],
    );
    await client.query(
      `UPDATE ${GROUP_PROFILE_TABLE}
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE catalog_code = $1 AND is_current = true`,
      [catalogCode, isValid, actorId, changeReason],
    );
  });
}

// ===== ITEMS DE CATALOGO (SCD2: core + profile) =====

export type UpsertItemInput = {
  catalogCode: string;
  itemCode: string;
  itemLabelEs: string;
  itemLabelEn?: string | null;
  itemDescription?: string | null;
  displayOrder?: number;
  actorId?: string;
  changeReason?: string;
};

export async function upsertAdminCatalogItem(input: UpsertItemInput): Promise<void> {
  await withAdminTransaction(async (client) => {
    const actor = input.actorId ?? null;
    const reason = input.changeReason ?? "manual_update";

    await client.query(
      `UPDATE ${ITEM_CORE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true AND is_valid = true`,
      [input.catalogCode, input.itemCode, actor, reason],
    );
    await client.query(
      `UPDATE ${ITEM_PROFILE_TABLE}
       SET is_current = false, valid_to = now(), loaded_at = now(), actor_id = $3, change_reason = $4
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true AND is_valid = true`,
      [input.catalogCode, input.itemCode, actor, reason],
    );

    await client.query(
      `INSERT INTO ${ITEM_CORE_TABLE}
        (record_id, catalog_code, item_code, valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, now(), true, true, $4, $5, $6)`,
      [crypto.randomUUID(), input.catalogCode, input.itemCode, RUN_ID, actor, reason],
    );
    await client.query(
      `INSERT INTO ${ITEM_PROFILE_TABLE}
        (record_id, catalog_code, item_code, item_label_es, item_label_en, item_description, display_order,
         valid_from, is_current, is_valid, run_id, actor_id, change_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now(), true, true, $8, $9, $10)`,
      [
        crypto.randomUUID(),
        input.catalogCode,
        input.itemCode,
        input.itemLabelEs,
        input.itemLabelEn ?? null,
        input.itemDescription ?? null,
        input.displayOrder ?? 0,
        RUN_ID,
        actor,
        reason,
      ],
    );
  });
}

export async function setAdminCatalogItemValidity(
  catalogCode: string,
  itemCode: string,
  isValid: boolean,
  actorId: string | null,
  changeReason: string = "manual_update",
): Promise<void> {
  await withAdminTransaction(async (client) => {
    await client.query(
      `UPDATE ${ITEM_CORE_TABLE}
       SET is_valid = $3, loaded_at = now(), actor_id = $4, change_reason = $5
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true`,
      [catalogCode, itemCode, isValid, actorId, changeReason],
    );
    await client.query(
      `UPDATE ${ITEM_PROFILE_TABLE}
       SET is_valid = $3, loaded_at = now(), actor_id = $4, change_reason = $5
       WHERE catalog_code = $1 AND item_code = $2 AND is_current = true`,
      [catalogCode, itemCode, isValid, actorId, changeReason],
    );
  });
}
