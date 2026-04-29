import { query } from "@/lib/db";
import { queryHumanTalent } from "@/lib/human-talent-db";

export type TthhCatalogGroup = {
  catalogCode: string;
  catalogName: string;
  catalogDescription: string | null;
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
  const [groups, items] = await Promise.all([
    queryHumanTalent<TthhCatalogGroup & {
      catalog_code: string;
      catalog_name: string;
      catalog_description: string | null;
      is_valid: boolean;
    }>(`
      SELECT catalog_code, catalog_name, catalog_description, is_valid
      FROM public.common_dim_catalog_group_scd2
      WHERE is_current = true
      ORDER BY catalog_code
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
    groups: groups.rows.map((row) => ({
      catalogCode: row.catalog_code,
      catalogName: row.catalog_name,
      catalogDescription: row.catalog_description,
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

export async function upsertTthhCatalogGroup(input: {
  catalogCode: string;
  catalogName: string;
  catalogDescription?: string | null;
  isValid?: boolean;
  actorId?: string;
}) {
  await queryHumanTalent(
    `
    INSERT INTO public.common_dim_catalog_group_scd2 (
      catalog_code, catalog_name, catalog_description, module_code, is_valid, run_id, actor_id, change_reason
    ) VALUES ($1, $2, $3, 'tthh_followups', $4, 'corex_admin_catalogs', $5, 'manual_update')
    ON CONFLICT (catalog_code) WHERE is_current = true and is_valid = true
    DO UPDATE SET
      catalog_name = EXCLUDED.catalog_name,
      catalog_description = EXCLUDED.catalog_description,
      is_valid = EXCLUDED.is_valid,
      loaded_at = now(),
      actor_id = EXCLUDED.actor_id,
      change_reason = 'manual_update'
    `,
    [input.catalogCode, input.catalogName, input.catalogDescription ?? null, input.isValid ?? true, input.actorId ?? null],
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

export async function setTthhCatalogValidity(kind: "group" | "item", input: {
  catalogCode: string;
  itemCode?: string;
  isValid: boolean;
  actorId?: string;
}) {
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

type GoalRow = Record<string, unknown>;

export async function listGoalsAdmin() {
  const [metrics, objectives, targets, dimensions] = await Promise.all([
    query<GoalRow>(`
      SELECT p.*
      FROM adm.adm_dim_goal_metric_profile_scd2 p
      WHERE p.is_current = true
      ORDER BY p.metric_code
    `),
    query<GoalRow>(`
      SELECT p.*
      FROM adm.adm_dim_goal_objective_profile_scd2 p
      WHERE p.is_current = true
      ORDER BY p.objective_code
    `),
    query<GoalRow>(`
      SELECT p.*
      FROM adm.adm_dim_goal_target_profile_scd2 p
      WHERE p.is_current = true
      ORDER BY p.target_code
    `),
    query<GoalRow>(`
      SELECT *
      FROM adm.adm_asgn_goal_target_dimension_scd2
      WHERE is_current = true
      ORDER BY target_id, dimension_level, dimension_type
    `),
  ]);

  return {
    metrics: metrics.rows,
    objectives: objectives.rows,
    targets: targets.rows,
    dimensions: dimensions.rows,
  };
}

export async function createGoalMetric(input: Record<string, unknown>, actorId?: string) {
  const core = await query<{ metric_id: string }>(
    `INSERT INTO adm.adm_ref_goal_metric_core_scd2 (run_id, actor_id, change_reason)
     VALUES ('corex_admin_goals', $1, 'manual_insert')
     RETURNING metric_id`,
    [actorId ?? null],
  );
  const metricId = core.rows[0]?.metric_id;
  await query(
    `INSERT INTO adm.adm_dim_goal_metric_profile_scd2 (
      metric_id, metric_code, metric_name, metric_description, metric_type, unit_of_measure,
      value_format, direction, source_schema, source_object, source_value_column, formula_sql,
      run_id, actor_id, change_reason
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'corex_admin_goals',$13,'manual_insert')`,
    [
      metricId,
      input.metricCode,
      input.metricName,
      input.metricDescription ?? null,
      input.metricType ?? null,
      input.unitOfMeasure ?? null,
      input.valueFormat ?? null,
      input.direction ?? null,
      input.sourceSchema ?? null,
      input.sourceObject ?? null,
      input.sourceValueColumn ?? null,
      input.formulaSql ?? null,
      actorId ?? null,
    ],
  );
}

export async function createGoalObjective(input: Record<string, unknown>, actorId?: string) {
  const core = await query<{ objective_id: string }>(
    `INSERT INTO adm.adm_ref_goal_objective_core_scd2 (run_id, actor_id, change_reason)
     VALUES ('corex_admin_goals', $1, 'manual_insert')
     RETURNING objective_id`,
    [actorId ?? null],
  );
  const objectiveId = core.rows[0]?.objective_id;
  await query(
    `INSERT INTO adm.adm_dim_goal_objective_profile_scd2 (
      objective_id, parent_objective_id, objective_code, objective_name, objective_description,
      objective_type, objective_status, period_grain, period_start, period_end, weight,
      run_id, actor_id, change_reason
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'corex_admin_goals',$12,'manual_insert')`,
    [
      objectiveId,
      input.parentObjectiveId || null,
      input.objectiveCode,
      input.objectiveName,
      input.objectiveDescription ?? null,
      input.objectiveType ?? null,
      input.objectiveStatus ?? "draft",
      input.periodGrain ?? null,
      input.periodStart || null,
      input.periodEnd || null,
      input.weight || null,
      actorId ?? null,
    ],
  );
}

export async function createGoalTarget(input: Record<string, unknown>, actorId?: string) {
  const core = await query<{ target_id: string }>(
    `INSERT INTO adm.adm_ref_goal_target_core_scd2 (run_id, actor_id, change_reason)
     VALUES ('corex_admin_goals', $1, 'manual_insert')
     RETURNING target_id`,
    [actorId ?? null],
  );
  const targetId = core.rows[0]?.target_id;
  await query(
    `INSERT INTO adm.adm_dim_goal_target_profile_scd2 (
      target_id, objective_id, metric_id, target_code, target_name, target_description,
      period_grain, period_start, period_end, target_operator, target_value,
      target_min_value, target_max_value, baseline_value, unit_of_measure, value_format, weight,
      run_id, actor_id, change_reason
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'corex_admin_goals',$18,'manual_insert')`,
    [
      targetId,
      input.objectiveId || null,
      input.metricId,
      input.targetCode,
      input.targetName,
      input.targetDescription ?? null,
      input.periodGrain ?? null,
      input.periodStart,
      input.periodEnd,
      input.targetOperator,
      input.targetValue || null,
      input.targetMinValue || null,
      input.targetMaxValue || null,
      input.baselineValue || null,
      input.unitOfMeasure ?? null,
      input.valueFormat ?? null,
      input.weight || null,
      actorId ?? null,
    ],
  );
}

export async function createGoalTargetDimension(input: Record<string, unknown>, actorId?: string) {
  await query(
    `INSERT INTO adm.adm_asgn_goal_target_dimension_scd2 (
      target_id, dimension_level, dimension_type, dimension_key, dimension_label,
      run_id, actor_id, change_reason
    ) VALUES ($1,$2,$3,$4,$5,'corex_admin_goals',$6,'manual_insert')`,
    [
      input.targetId,
      input.dimensionLevel || 1,
      input.dimensionType,
      input.dimensionKey,
      input.dimensionLabel ?? null,
      actorId ?? null,
    ],
  );
}

export async function setGoalEntityValidity(entity: string, id: string, isValid: boolean, actorId?: string) {
  const config = {
    metric: ["adm.adm_dim_goal_metric_profile_scd2", "metric_id"],
    objective: ["adm.adm_dim_goal_objective_profile_scd2", "objective_id"],
    target: ["adm.adm_dim_goal_target_profile_scd2", "target_id"],
  } as const;
  const selected = config[entity as keyof typeof config];
  if (!selected) throw new Error("Entidad no soportada.");
  await query(
    `UPDATE ${selected[0]} SET is_valid = $2, actor_id = $3, change_reason = 'manual_update', loaded_at = now()
     WHERE ${selected[1]} = $1 AND is_current = true`,
    [id, isValid, actorId ?? null],
  );
}
