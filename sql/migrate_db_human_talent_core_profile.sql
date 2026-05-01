-- ============================================================================
-- MIGRACIÓN db_human_talent: renombrar dims a _profile_ y crear tablas _core_
-- ============================================================================
-- Ejecutar contra db_human_talent.
-- Idempotente: verifica existencia antes de renombrar/crear.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASO 1: Renombrar tablas dim existentes → _profile_
-- ============================================================================

-- 1.1 common_dim_catalog_domain_cur → common_dim_catalog_domain_profile_cur
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='common_dim_catalog_domain_cur')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='common_dim_catalog_domain_profile_cur')
  THEN
    ALTER TABLE public.common_dim_catalog_domain_cur RENAME TO common_dim_catalog_domain_profile_cur;
    RAISE NOTICE 'Renamed common_dim_catalog_domain_cur → common_dim_catalog_domain_profile_cur';
  END IF;
END $$;

-- 1.2 common_dim_catalog_group_scd2 → common_dim_catalog_group_profile_scd2
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='common_dim_catalog_group_scd2')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='common_dim_catalog_group_profile_scd2')
  THEN
    ALTER TABLE public.common_dim_catalog_group_scd2 RENAME TO common_dim_catalog_group_profile_scd2;
    RAISE NOTICE 'Renamed common_dim_catalog_group_scd2 → common_dim_catalog_group_profile_scd2';
  END IF;
END $$;

-- 1.3 common_dim_catalog_item_scd2 → common_dim_catalog_item_profile_scd2
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='common_dim_catalog_item_scd2')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='common_dim_catalog_item_profile_scd2')
  THEN
    ALTER TABLE public.common_dim_catalog_item_scd2 RENAME TO common_dim_catalog_item_profile_scd2;
    RAISE NOTICE 'Renamed common_dim_catalog_item_scd2 → common_dim_catalog_item_profile_scd2';
  END IF;
END $$;

-- ============================================================================
-- PASO 2: Crear tablas core nuevas
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2.1 Core — Catalog Groups
CREATE TABLE IF NOT EXISTS public.common_ref_catalog_group_id_core_scd2 (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_code text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  is_valid boolean NOT NULL DEFAULT true,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  run_id text NOT NULL,
  actor_id text,
  change_reason text NOT NULL,
  CONSTRAINT uq_common_catalog_group_core_code_from UNIQUE (catalog_code, valid_from),
  CONSTRAINT chk_common_catalog_group_core_validity_window CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_common_catalog_group_core_active
  ON public.common_ref_catalog_group_id_core_scd2 (catalog_code)
  WHERE is_current = true AND is_valid = true;

-- 2.2 Core — Catalog Items
CREATE TABLE IF NOT EXISTS public.common_ref_catalog_item_id_core_scd2 (
  record_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_code text NOT NULL,
  item_code text NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  is_current boolean NOT NULL DEFAULT true,
  is_valid boolean NOT NULL DEFAULT true,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  run_id text NOT NULL,
  actor_id text,
  change_reason text NOT NULL,
  CONSTRAINT uq_common_catalog_item_core_code_from UNIQUE (catalog_code, item_code, valid_from),
  CONSTRAINT chk_common_catalog_item_core_validity_window CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_common_catalog_item_core_active
  ON public.common_ref_catalog_item_id_core_scd2 (catalog_code, item_code)
  WHERE is_current = true AND is_valid = true;

-- ============================================================================
-- PASO 3: Poblar tablas core desde datos existentes en profile
-- ============================================================================

-- 3.1 Core catalog groups desde profile
INSERT INTO public.common_ref_catalog_group_id_core_scd2
  (record_id, catalog_code, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason)
SELECT gen_random_uuid(), p.catalog_code, p.valid_from, p.valid_to, p.is_current, p.is_valid, p.loaded_at, 'migration_core_profile_v1', p.actor_id, 'migration_backfill'
FROM public.common_dim_catalog_group_profile_scd2 p
WHERE NOT EXISTS (
  SELECT 1 FROM public.common_ref_catalog_group_id_core_scd2 c
  WHERE c.catalog_code = p.catalog_code AND c.valid_from = p.valid_from
);

-- 3.2 Core catalog items desde profile
INSERT INTO public.common_ref_catalog_item_id_core_scd2
  (record_id, catalog_code, item_code, valid_from, valid_to, is_current, is_valid, loaded_at, run_id, actor_id, change_reason)
SELECT gen_random_uuid(), p.catalog_code, p.item_code, p.valid_from, p.valid_to, p.is_current, p.is_valid, p.loaded_at, 'migration_core_profile_v1', p.actor_id, 'migration_backfill'
FROM public.common_dim_catalog_item_profile_scd2 p
WHERE NOT EXISTS (
  SELECT 1 FROM public.common_ref_catalog_item_id_core_scd2 c
  WHERE c.catalog_code = p.catalog_code AND c.item_code = p.item_code AND c.valid_from = p.valid_from
);

-- ============================================================================
-- PASO 4: Recrear vistas que apuntaban a nombres viejos
-- ============================================================================

DROP VIEW IF EXISTS public.vw_tthh_employee_followup_catalog_mismatch_cur;
DROP VIEW IF EXISTS public.vw_tthh_employee_followup_response_with_labels_cur;

-- 4.1 Latest + labels (usa _profile_ ahora)
CREATE VIEW public.vw_tthh_employee_followup_response_with_labels_cur AS
SELECT
  f.event_id,
  f.unique_follow_up_code,
  f.person_id,
  f.followup_route_code,
  f.event_date,
  f.follow_up_date,
  f.is_valid,
  f.has_inconvenience_code,
  inc_yn.item_label_es AS has_inconvenience_label,
  f.retention_intention_code,
  ret.item_label_es AS retention_intention_label,
  f.final_retention_intention_code,
  ret_fin.item_label_es AS final_retention_intention_label,
  f.invalid_reason_code,
  inv.item_label_es AS invalid_reason_label
FROM public.vw_tthh_employee_followup_response_latest_cur f
LEFT JOIN public.common_dim_catalog_item_profile_scd2 inc_yn
  ON inc_yn.catalog_code = 'yes_no'
 AND inc_yn.item_code = f.has_inconvenience_code
 AND inc_yn.is_current = true AND inc_yn.is_valid = true
LEFT JOIN public.common_dim_catalog_item_profile_scd2 ret
  ON ret.catalog_code = 'retention_intention'
 AND ret.item_code = f.retention_intention_code
 AND ret.is_current = true AND ret.is_valid = true
LEFT JOIN public.common_dim_catalog_item_profile_scd2 ret_fin
  ON ret_fin.catalog_code = 'retention_intention'
 AND ret_fin.item_code = f.final_retention_intention_code
 AND ret_fin.is_current = true AND ret_fin.is_valid = true
LEFT JOIN public.common_dim_catalog_item_profile_scd2 inv
  ON inv.catalog_code = 'employee_followup_invalid_reason'
 AND inv.item_code = f.invalid_reason_code
 AND inv.is_current = true AND inv.is_valid = true;

-- 4.2 Mismatch view (usa _profile_ ahora)
CREATE VIEW public.vw_tthh_employee_followup_catalog_mismatch_cur AS
WITH fact_codes AS (
  SELECT event_id, 'treatment_rating' AS catalog_code, coworker_treatment_rating_code AS item_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE coworker_treatment_rating_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'treatment_rating', supervisor_treatment_rating_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE supervisor_treatment_rating_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'treatment_rating', area_manager_treatment_rating_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE area_manager_treatment_rating_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'retention_intention', retention_intention_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE retention_intention_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'retention_intention', final_retention_intention_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE final_retention_intention_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'hr_support_need', hr_support_need_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE hr_support_need_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'family_pregnancy_relation', family_pregnancy_relation_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE family_pregnancy_relation_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'yes_no', has_inconvenience_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE has_inconvenience_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'inconvenience_activity', inconvenience_activity_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE inconvenience_activity_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'inconvenience_type', inconvenience_type_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE inconvenience_type_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'adaptation_response', induction_sufficient_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE induction_sufficient_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'adaptation_response', transport_problem_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE transport_problem_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'adaptation_response', team_welcome_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE team_welcome_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'satisfaction_level', role_clarity_satisfaction_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE role_clarity_satisfaction_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'satisfaction_level', work_environment_satisfaction_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE work_environment_satisfaction_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'satisfaction_level', equipment_satisfaction_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE equipment_satisfaction_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'satisfaction_level', recent_work_satisfaction_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE recent_work_satisfaction_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'work_aspect_to_improve', work_aspect_to_improve_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE work_aspect_to_improve_code IS NOT NULL
  UNION ALL
  SELECT event_id, 'employee_followup_invalid_reason', invalid_reason_code
  FROM public.tthh_fact_employee_followup_response_cur WHERE invalid_reason_code IS NOT NULL
),
sel_codes AS (
  SELECT event_id, catalog_code, item_code
  FROM public.tthh_asgn_employee_followup_catalog_selection_cur
  WHERE is_valid = true
),
all_codes AS (
  SELECT 'fact'::text AS origin, event_id, catalog_code, item_code FROM fact_codes
  UNION ALL
  SELECT 'selection', event_id, catalog_code, item_code FROM sel_codes
)
SELECT
  c.origin,
  c.event_id,
  c.catalog_code,
  c.item_code
FROM all_codes c
LEFT JOIN public.common_dim_catalog_item_profile_scd2 i
  ON i.catalog_code = c.catalog_code
 AND i.item_code = c.item_code
 AND i.is_current = true AND i.is_valid = true
WHERE i.record_id IS NULL;

COMMIT;
