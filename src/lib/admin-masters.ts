import { queryHumanTalent } from "@/lib/human-talent-db";

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
      FROM public.common_dim_catalog_domain_cur
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
      FROM public.common_dim_catalog_group_scd2
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
      FROM public.common_dim_catalog_item_scd2
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
    INSERT INTO public.common_dim_catalog_domain_cur (
      domain_code, domain_name, domain_description, module_code, display_order, is_valid, run_id, actor_id, change_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, 'corex_tthh_catalog_domains', $7, 'manual_update')
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
  await queryHumanTalent(
    `
    INSERT INTO public.common_dim_catalog_group_scd2 (
      catalog_code, catalog_name, catalog_description, module_code, domain_code, is_valid, run_id, actor_id, change_reason
    ) VALUES ($1, $2, $3, 'tthh_followups', $4, $5, 'corex_admin_catalogs', $6, 'manual_update')
    ON CONFLICT (catalog_code) WHERE is_current = true and is_valid = true
    DO UPDATE SET
      catalog_name = EXCLUDED.catalog_name,
      catalog_description = EXCLUDED.catalog_description,
      domain_code = EXCLUDED.domain_code,
      is_valid = EXCLUDED.is_valid,
      loaded_at = now(),
      actor_id = EXCLUDED.actor_id,
      change_reason = 'manual_update'
    `,
    [
      input.catalogCode,
      input.catalogName,
      input.catalogDescription ?? null,
      input.domainCode ?? "seguimiento_trabajo_social",
      input.isValid ?? true,
      input.actorId ?? null,
    ],
  );
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
  await queryHumanTalent(
    `
    INSERT INTO public.common_dim_catalog_item_scd2 (
      catalog_code, item_code, item_label_es, item_description, display_order, is_valid, run_id, actor_id, change_reason
    ) VALUES ($1, $2, $3, $4, $5, $6, 'corex_admin_catalog_items', $7, 'manual_update')
    ON CONFLICT (catalog_code, item_code) WHERE is_current = true and is_valid = true
    DO UPDATE SET
      item_label_es = EXCLUDED.item_label_es,
      item_description = EXCLUDED.item_description,
      display_order = EXCLUDED.display_order,
      is_valid = EXCLUDED.is_valid,
      loaded_at = now(),
      actor_id = EXCLUDED.actor_id,
      change_reason = 'manual_update'
    `,
    [
      input.catalogCode,
      input.itemCode,
      input.itemLabelEs,
      input.itemDescription ?? null,
      input.displayOrder ?? 0,
      input.isValid ?? true,
      input.actorId ?? null,
    ],
  );
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
      `UPDATE public.common_dim_catalog_domain_cur
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = 'manual_update'
       WHERE domain_code = $1`,
      [input.domainCode, input.isValid, input.actorId ?? null],
    );
    return;
  }
  if (kind === "group") {
    await queryHumanTalent(
      `UPDATE public.common_dim_catalog_group_scd2
       SET is_valid = $2, loaded_at = now(), actor_id = $3, change_reason = 'manual_update'
       WHERE catalog_code = $1 AND is_current = true`,
      [input.catalogCode, input.isValid, input.actorId ?? null],
    );
    return;
  }

  await queryHumanTalent(
    `UPDATE public.common_dim_catalog_item_scd2
     SET is_valid = $3, loaded_at = now(), actor_id = $4, change_reason = 'manual_update'
     WHERE catalog_code = $1 AND item_code = $2 AND is_current = true`,
    [input.catalogCode, input.itemCode, input.isValid, input.actorId ?? null],
  );
}
