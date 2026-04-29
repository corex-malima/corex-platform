import { queryHumanTalent } from "@/lib/human-talent-db";
import type {
  CatalogItemQueryRow,
  EmployeeFollowupCatalogMap,
} from "@/modules/talento-humano/seguimientos/server/types";

/**
 * Carga todos los ítems de catálogo activos y los agrupa por catalog_code.
 * Solo consulta db_human_talent.public (no cruza con el DW).
 * Retorna mapa vacío si db_human_talent no está configurada o el SQL aún no se aplicó.
 */
export async function loadFollowupCatalogs(): Promise<EmployeeFollowupCatalogMap> {
  try {
    const result = await queryHumanTalent<CatalogItemQueryRow>(`
      SELECT i.catalog_code, i.item_code, i.item_label_es, i.display_order
      FROM public.common_dim_catalog_item_scd2 i
      WHERE i.is_current = true
        AND i.is_valid = true
      ORDER BY i.catalog_code, i.display_order, i.item_code
    `);

    const map: EmployeeFollowupCatalogMap = {};

    for (const row of result.rows) {
      const group = map[row.catalog_code] ?? [];
      group.push({
        itemCode: row.item_code,
        itemLabelEs: row.item_label_es,
        displayOrder: row.display_order,
      });
      map[row.catalog_code] = group;
    }

    return map;
  } catch {
    // db_human_talent no configurada o SQL aún no aplicado → catálogos vacíos.
    // El módulo carga pero los selectores aparecen vacíos hasta que se ejecute sql/db_human_talent.sql.
    return {};
  }
}

/**
 * Carga ítems de un catálogo específico activo.
 * Retorna arreglo vacío si db_human_talent no está disponible.
 */
export async function loadFollowupCatalogItems(catalogCode: string) {
  try {
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
  } catch {
    return [];
  }
}
