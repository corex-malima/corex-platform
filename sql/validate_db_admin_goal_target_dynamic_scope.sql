-- ============================================================================
-- Validation - db_admin dynamic K-level goal/target scope
-- Apply/read against: db_admin.public
-- ============================================================================

-- 1. Principal table counts.
SELECT 'adm_dim_goal_target_profile_scd2' AS object_name, count(*)::bigint AS row_count
FROM public.adm_dim_goal_target_profile_scd2
UNION ALL
SELECT 'adm_dim_metric_profile_scd2', count(*)::bigint
FROM public.adm_dim_metric_profile_scd2
UNION ALL
SELECT 'adm_dim_unit_of_measure_profile_scd2', count(*)::bigint
FROM public.adm_dim_unit_of_measure_profile_scd2
UNION ALL
SELECT 'adm_dim_catalog_domain_profile_cur', count(*)::bigint
FROM public.adm_dim_catalog_domain_profile_cur
UNION ALL
SELECT 'adm_dim_catalog_group_profile_scd2', count(*)::bigint
FROM public.adm_dim_catalog_group_profile_scd2
UNION ALL
SELECT 'adm_dim_catalog_item_profile_scd2', count(*)::bigint
FROM public.adm_dim_catalog_item_profile_scd2
UNION ALL
SELECT 'adm_asgn_goal_target_domain_scd2', count(*)::bigint
FROM public.adm_asgn_goal_target_domain_scd2
UNION ALL
SELECT 'adm_asgn_goal_target_type_scd2', count(*)::bigint
FROM public.adm_asgn_goal_target_type_scd2;

-- 2. Required new column null checks.
SELECT
  count(*) FILTER (WHERE target_kind_code IS NULL) AS null_target_kind_code,
  count(*) FILTER (WHERE target_scope_jsonb IS NULL) AS null_target_scope_jsonb,
  count(*) FILTER (WHERE target_scope_hash IS NULL) AS null_target_scope_hash,
  count(*) FILTER (WHERE display_order IS NULL) AS null_display_order,
  count(*) FILTER (WHERE attributes_jsonb IS NULL) AS null_attributes_jsonb,
  count(*) FILTER (WHERE jsonb_typeof(target_scope_jsonb) <> 'object') AS invalid_scope_type,
  count(*) FILTER (WHERE jsonb_typeof(attributes_jsonb) <> 'object') AS invalid_attributes_type
FROM public.adm_dim_goal_target_profile_scd2;

-- 3. Active duplicate check for the optional unique active scope rule.
SELECT
  domain_code,
  metric_code,
  target_kind_code,
  target_scope_hash,
  count(*) AS active_count
FROM public.adm_dim_goal_target_profile_scd2
WHERE is_current = true
  AND is_valid = true
  AND domain_code IS NOT NULL
  AND metric_code IS NOT NULL
  AND target_scope_hash IS NOT NULL
GROUP BY domain_code, metric_code, target_kind_code, target_scope_hash
HAVING count(*) > 1
ORDER BY active_count DESC, domain_code, metric_code, target_kind_code;

-- 4. View smoke checks.
SELECT *
FROM public.vw_adm_goal_target_active
LIMIT 5;

SELECT *
FROM public.vw_adm_goal_target_history
LIMIT 5;

SELECT *
FROM public.vw_adm_goal_target_scope_levels_active
LIMIT 5;

SELECT *
FROM public.vw_adm_goal_target_active_flat
LIMIT 5;

-- 5. Index/constraint presence.
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'adm_dim_goal_target_profile_scd2'
  AND indexname IN (
    'ix_adm_goal_target_scope_gin',
    'ix_adm_goal_target_scope_filters_gin',
    'ix_adm_goal_target_domain_metric_active',
    'ix_adm_goal_target_code_active',
    'ix_adm_goal_target_scope_hash',
    'uq_adm_goal_target_active_scope'
  )
ORDER BY indexname;

SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.adm_dim_goal_target_profile_scd2'::regclass
  AND conname IN (
    'chk_adm_goal_target_scope_is_object',
    'chk_adm_goal_target_attributes_is_object',
    'chk_adm_goal_target_scope_contract'
  )
ORDER BY conname;
