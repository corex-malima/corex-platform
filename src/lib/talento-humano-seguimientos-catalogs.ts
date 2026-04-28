import { queryHumanTalent } from "@/lib/human-talent-db";
import type {
  CatalogItemQueryRow,
  EmployeeFollowupCatalogMap,
} from "@/modules/talento-humano/seguimientos/server/types";

/**
 * Carga todos los ítems de catálogo activos y los agrupa por catalog_code.
 * Solo consulta db_human_talent.public (no cruza con el DW).
 */
export async function loadFollowupCatalogs(): Promise<EmployeeFollowupCatalogMap> {
  const pool = await queryHumanTalent<CatalogItemQueryRow>(`
    SELECT i.catalog_code, i.item_code, i.item_label_es, i.display_order
    FROM public.common_dim_catalog_item_scd2 i
    WHERE i.is_current = true
      AND i.is_valid = true
    ORDER BY i.catalog_code, i.display_order, i.item_code
  `);

  const map: EmployeeFollowupCatalogMap = {};

  for (const row of pool.rows) {
    const group = map[row.catalog_code] ?? [];
    group.push({
      itemCode: row.item_code,
      itemLabelEs: row.item_label_es,
      displayOrder: row.display_order,
    });
    map[row.catalog_code] = group;
  }

  return map;
}

/**
 * Carga ítems de un catálogo específico activo.
 */
export async function loadFollowupCatalogItems(catalogCode: string) {
  const result = await queryHumanTalent<CatalogItemQueryRow>(
    `
    SELECT i.catalog_code, i.item_code, i.item_label_es, i.display_order
    FROM public.common_dim_catalog_item_scd2 i
    WHERE i.catalog_code = $1
      AND i.is_current = true
      AND i.is_valid = true
    ORDER BY i.display_order, i.item_code
    `,
    [catalogCode],
  );

  return result.rows.map((row) => ({
    itemCode: row.item_code,
    itemLabelEs: row.item_label_es,
    displayOrder: row.display_order,
  }));
}
