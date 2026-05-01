-- ============================================================================
-- db_admin - Rename Postharvest Balances metric from Hours/Bed to Boxes/Bed
-- Apply against: db_admin.public
--
-- Idempotent correction. Preserves all target values and dynamic scope JSONB.
-- ============================================================================

BEGIN;

-- Unit correction.
UPDATE public.adm_ref_unit_of_measure_id_core_scd2
SET
  unit_code = 'BOX_PER_BED',
  loaded_at = now(),
  run_id = 'rename_hours_per_bed_to_boxes_per_bed_v1',
  actor_id = 'system',
  change_reason = 'source_correction'
WHERE unit_code = 'HR_PER_BED';

UPDATE public.adm_dim_unit_of_measure_profile_scd2
SET
  unit_code = 'BOX_PER_BED',
  unit_name = 'Cajas por cama',
  unit_symbol = 'cajas/cama',
  unit_category_code = 'count',
  notes_text = 'Unidad operativa para metas de Cajas / Cama.',
  loaded_at = now(),
  run_id = 'rename_hours_per_bed_to_boxes_per_bed_v1',
  actor_id = 'system',
  change_reason = 'source_correction'
WHERE unit_code = 'HR_PER_BED'
   OR unit_code = 'BOX_PER_BED';

-- Metric correction.
UPDATE public.adm_ref_metric_id_core_scd2
SET
  metric_code = 'boxes_per_bed',
  loaded_at = now(),
  run_id = 'rename_hours_per_bed_to_boxes_per_bed_v1',
  actor_id = 'system',
  change_reason = 'source_correction'
WHERE metric_code = 'hours_per_bed';

UPDATE public.adm_dim_metric_profile_scd2
SET
  metric_code = 'boxes_per_bed',
  metric_name = 'Cajas / Cama',
  metric_description = 'Meta operativa de cajas por cama por subdominio, variedad, tipo SP y semana ISO.',
  unit_code = 'BOX_PER_BED',
  notes_text = 'Seed inicial para Postcosecha / Balanzas.',
  loaded_at = now(),
  run_id = 'rename_hours_per_bed_to_boxes_per_bed_v1',
  actor_id = 'system',
  change_reason = 'source_correction'
WHERE metric_code = 'hours_per_bed'
   OR metric_code = 'boxes_per_bed';

-- Target correction: target codes and visible labels.
UPDATE public.adm_ref_goal_target_id_core_scd2
SET
  target_code = replace(target_code, 'hours_per_bed', 'boxes_per_bed'),
  loaded_at = now(),
  run_id = 'rename_hours_per_bed_to_boxes_per_bed_v1',
  actor_id = 'system',
  change_reason = 'source_correction'
WHERE target_code LIKE 'hours_per_bed_balances_%';

UPDATE public.adm_dim_goal_target_profile_scd2
SET
  target_code = replace(target_code, 'hours_per_bed', 'boxes_per_bed'),
  target_name = replace(target_name, 'Horas / Cama', 'Cajas / Cama'),
  target_description = replace(target_description, 'Horas / Cama', 'Cajas / Cama'),
  metric_code = 'boxes_per_bed',
  target_grain_code = replace(target_grain_code, 'hours_per_bed', 'boxes_per_bed'),
  target_scope_jsonb = jsonb_set(
    jsonb_set(
      target_scope_jsonb,
      '{grain_code}',
      to_jsonb(replace(COALESCE(target_scope_jsonb ->> 'grain_code', ''), 'hours_per_bed', 'boxes_per_bed')),
      true
    ),
    '{filters,metric_context}',
    to_jsonb('boxes_per_bed'::text),
    true
  ),
  attributes_jsonb = jsonb_set(
    COALESCE(attributes_jsonb, '{}'::jsonb),
    '{metric_label}',
    to_jsonb('Cajas / Cama'::text),
    true
  ),
  loaded_at = now(),
  run_id = 'rename_hours_per_bed_to_boxes_per_bed_v1',
  actor_id = 'system',
  change_reason = 'source_correction'
WHERE metric_code = 'hours_per_bed'
   OR target_code LIKE 'hours_per_bed_balances_%'
   OR target_code LIKE 'boxes_per_bed_balances_%';

COMMIT;
