-- ============================================================================
-- SAMPLE ONLY - Bed hours target with dynamic K-level JSONB scope
-- Apply against: db_admin.public
--
-- This file is intentionally wrapped in ROLLBACK. Replace sample codes with
-- real governed codes and change ROLLBACK to COMMIT only after explicit approval.
-- ============================================================================

BEGIN;

WITH sample_target AS (
  SELECT
    'BED_HOURS_WEEKLY_FREEDOM_SP01_PEELED_202618'::text AS target_code,
    'Meta semanal de horas cama - Freedom SP01 Pelado 202618'::text AS target_name,
    'PRODUCCION'::text AS domain_code,
    'TARGET'::text AS target_kind_code,
    'BED_HOURS'::text AS metric_code,
    'EQ'::text AS operator_code,
    120::numeric AS value_min,
    NULL::numeric AS value_max,
    NULL::text AS value_text,
    '2026-04-27 00:00:00-05'::timestamptz AS valid_from,
    jsonb_build_object(
      'grain_code', 'BED_HOURS_BY_VARIETY_SP_PEELING_WEEK',
      'levels', jsonb_build_array(
        jsonb_build_object(
          'level_index', 1,
          'level_key', 'variety_code',
          'level_label', 'Variedad',
          'value_code', 'FREEDOM',
          'value_label', 'Freedom'
        ),
        jsonb_build_object(
          'level_index', 2,
          'level_key', 'sp_type_code',
          'level_label', 'Tipo SP',
          'value_code', 'SP01',
          'value_label', 'SP 01'
        ),
        jsonb_build_object(
          'level_index', 3,
          'level_key', 'peeling_code',
          'level_label', 'Condicion',
          'value_code', 'PEELED',
          'value_label', 'Pelado'
        ),
        jsonb_build_object(
          'level_index', 4,
          'level_key', 'iso_week_id',
          'level_label', 'Semana ISO',
          'value_code', '202618',
          'value_label', 'Semana 202618'
        )
      ),
      'filters', jsonb_build_object(
        'variety_code', 'FREEDOM',
        'sp_type_code', 'SP01',
        'peeling_code', 'PEELED',
        'iso_week_id', '202618'
      )
    ) AS target_scope_jsonb
),
core_insert AS (
  INSERT INTO public.adm_ref_goal_target_id_core_scd2
    (record_id, target_code, valid_from, is_current, is_valid, run_id, change_reason)
  SELECT
    gen_random_uuid(),
    target_code,
    valid_from,
    true,
    true,
    'sample_bed_hours_target',
    'manual_insert'
  FROM sample_target
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.adm_ref_goal_target_id_core_scd2 c
    WHERE c.target_code = sample_target.target_code
      AND c.is_current = true
      AND c.is_valid = true
  )
  RETURNING target_code
)
INSERT INTO public.adm_dim_goal_target_profile_scd2 (
  record_id,
  target_code,
  target_name,
  target_description,
  level_index,
  level_label,
  domain_code,
  target_kind_code,
  metric_code,
  operator_code,
  value_min,
  value_max,
  value_text,
  valid_from,
  is_current,
  is_valid,
  target_grain_code,
  target_scope_jsonb,
  display_order,
  attributes_jsonb,
  run_id,
  change_reason
)
SELECT
  gen_random_uuid(),
  target_code,
  target_name,
  'SAMPLE - no usar sin validar catalogos reales',
  1,
  'Meta operativa',
  domain_code,
  target_kind_code,
  metric_code,
  operator_code,
  value_min,
  value_max,
  value_text,
  valid_from,
  true,
  true,
  target_scope_jsonb ->> 'grain_code',
  target_scope_jsonb,
  10,
  '{}'::jsonb,
  'sample_bed_hours_target',
  'manual_insert'
FROM sample_target;

-- Query by metric and K-level filters.
SELECT
  target_code,
  target_name,
  domain_code,
  metric_code,
  value_min,
  operator_code,
  variety_code,
  sp_type_code,
  peeling_code,
  iso_week_id
FROM public.vw_adm_goal_target_active_flat
WHERE metric_code = 'BED_HOURS'
  AND variety_code = 'FREEDOM'
  AND iso_week_id = '202618';

ROLLBACK;
