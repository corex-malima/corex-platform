-- ============================================================
-- STRATEGIC DATABASE INDICES
-- ============================================================
-- Execute in DBeaver against datalakehouse (10.0.2.70:5432)
-- Safe to run multiple times (IF NOT EXISTS)
-- To rollback: see DROP statements at the bottom
-- ============================================================
-- IMPORTANT: All column names verified against actual queries in src/lib/
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FENOGRAMA (gld.mv_prod_fenograma_cur)
-- Real columns: cycle_key, parent_block, variety, sp_type,
--               sp_date, harvest_start_date, harvest_end_date,
--               iso_week_id, stems_count
-- NOTE: "area" is NOT a column — it is derived via CASE/split_part
--       from cycle_key and parent_block in the application query.
-- ────────────────────────────────────────────────────────────

-- For JOIN with slv.camp_dim_cycle_profile_scd2 on cycle_key
CREATE INDEX IF NOT EXISTS idx_fenograma_cycle_key
  ON gld.mv_prod_fenograma_cur(cycle_key);

-- For parent_block filter (used in block drill-down)
CREATE INDEX IF NOT EXISTS idx_fenograma_parent_block
  ON gld.mv_prod_fenograma_cur(parent_block);

-- For date lifecycle filters (sp_date >= current_date, harvest_end_date)
CREATE INDEX IF NOT EXISTS idx_fenograma_sp_date
  ON gld.mv_prod_fenograma_cur(sp_date);

CREATE INDEX IF NOT EXISTS idx_fenograma_harvest_end
  ON gld.mv_prod_fenograma_cur(harvest_end_date);

-- For week aggregation
CREATE INDEX IF NOT EXISTS idx_fenograma_iso_week
  ON gld.mv_prod_fenograma_cur(iso_week_id);

-- For variety and sp_type filters
CREATE INDEX IF NOT EXISTS idx_fenograma_variety
  ON gld.mv_prod_fenograma_cur(variety);

CREATE INDEX IF NOT EXISTS idx_fenograma_sp_type
  ON gld.mv_prod_fenograma_cur(sp_type);

-- ────────────────────────────────────────────────────────────
-- MORTALITY / KARDEX
-- gld.mv_camp_kardex_cycle_plants_cur
-- Real columns: cycle_key, valid_from, valid_to, area_id,
--               block_id, variety, sp_type, initial_plants,
--               dead_plants_count, reseed_plants_count,
--               initial_plants_cycle, final_plants_count, etc.
-- ────────────────────────────────────────────────────────────

-- For cycle lookup + latest record (DISTINCT ON cycle_key ORDER BY valid_from DESC)
CREATE INDEX IF NOT EXISTS idx_kardex_cycle_valid_from
  ON gld.mv_camp_kardex_cycle_plants_cur(cycle_key, valid_from DESC NULLS LAST);

-- ────────────────────────────────────────────────────────────
-- MORTALITY DAY CURVES
-- gld.mv_camp_kardex_cycle_plants_day_cur
-- gld.mv_camp_kardex_valve_plants_day_cur
-- gld.mv_camp_kardex_bed_plants_day_cur
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_kardex_day_cycle
  ON gld.mv_camp_kardex_cycle_plants_day_cur(cycle_key, calendar_date ASC);

CREATE INDEX IF NOT EXISTS idx_kardex_valve_day
  ON gld.mv_camp_kardex_valve_plants_day_cur(cycle_key, valve_id, calendar_date ASC);

CREATE INDEX IF NOT EXISTS idx_kardex_bed_day
  ON gld.mv_camp_kardex_bed_plants_day_cur(cycle_key, bed_id, calendar_date ASC);

-- ────────────────────────────────────────────────────────────
-- CYCLE PROFILE (slv.camp_dim_cycle_profile_scd2)
-- Real columns: cycle_key, is_current, valid_from, valid_to,
--               parent_block, block_id, variety, sp_type,
--               pruning_date, harvest_start_date, harvest_end_date,
--               area_id, soil_type, etc.
-- Used in LATERAL JOINs: WHERE cp.cycle_key = X ORDER BY valid_from DESC LIMIT 1
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cycle_profile_key_from
  ON slv.camp_dim_cycle_profile_scd2(cycle_key, valid_from DESC NULLS LAST);

-- ────────────────────────────────────────────────────────────
-- BLOCK PROFILE (slv.camp_dim_block_profile_scd2)
-- Real columns: parent_block, is_current, valid_from, valid_to,
--               area_id, etc.
-- Used: WHERE bp.parent_block = X AND bp.is_current = true
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_block_profile_current
  ON slv.camp_dim_block_profile_scd2(parent_block, is_current, valid_from DESC NULLS LAST);

-- ────────────────────────────────────────────────────────────
-- BED PROFILE (slv.camp_dim_bed_profile_scd2)
-- Real columns: record_id, bed_id, cycle_key, valve_id,
--               valid_from, is_current, length, width,
--               pambiles_count, variety, sp_type, etc.
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bed_profile_cycle
  ON slv.camp_dim_bed_profile_scd2(cycle_key, is_current DESC, valid_from DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_bed_profile_valve
  ON slv.camp_dim_bed_profile_scd2(cycle_key, valve_id);

-- ────────────────────────────────────────────────────────────
-- VALVE PROFILE (slv.camp_dim_valve_profile_scd2)
-- Real columns: record_id, valve_id, cycle_key, block_id,
--               valid_from, is_current, etc.
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_valve_profile_cycle
  ON slv.camp_dim_valve_profile_scd2(cycle_key, is_current DESC, valid_from DESC NULLS LAST);

-- ────────────────────────────────────────────────────────────
-- PROGRAMACIONES (mdl.prod_ref_vegetativo_subset_scd2)
-- Real columns: cycle_key, activity_code, event_date
-- ────────────────────────────────────────────────────────────

-- For SPMC/ILUMINACION/FMGYP/FM13 filtered by date range
CREATE INDEX IF NOT EXISTS idx_vegetativo_activity_date
  ON mdl.prod_ref_vegetativo_subset_scd2(activity_code, event_date);

-- For ilum_bounds CTE: GROUP BY cycle_key WHERE activity_code = 'ILUMINACION'
CREATE INDEX IF NOT EXISTS idx_vegetativo_cycle_activity
  ON mdl.prod_ref_vegetativo_subset_scd2(cycle_key, activity_code);

-- ────────────────────────────────────────────────────────────
-- USERS (public.users)
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_username
  ON public.users(username);

-- ============================================================
-- VERIFY: Check indices were created
-- ============================================================
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY schemaname, tablename, indexname;

-- ============================================================
-- ROLLBACK (uncomment to remove all indices)
-- ============================================================
-- DROP INDEX IF EXISTS gld.idx_fenograma_cycle_key;
-- DROP INDEX IF EXISTS gld.idx_fenograma_parent_block;
-- DROP INDEX IF EXISTS gld.idx_fenograma_sp_date;
-- DROP INDEX IF EXISTS gld.idx_fenograma_harvest_end;
-- DROP INDEX IF EXISTS gld.idx_fenograma_iso_week;
-- DROP INDEX IF EXISTS gld.idx_fenograma_variety;
-- DROP INDEX IF EXISTS gld.idx_fenograma_sp_type;
-- DROP INDEX IF EXISTS gld.idx_kardex_cycle_valid_from;
-- DROP INDEX IF EXISTS gld.idx_kardex_day_cycle;
-- DROP INDEX IF EXISTS gld.idx_kardex_valve_day;
-- DROP INDEX IF EXISTS gld.idx_kardex_bed_day;
-- DROP INDEX IF EXISTS slv.idx_cycle_profile_key_from;
-- DROP INDEX IF EXISTS slv.idx_block_profile_current;
-- DROP INDEX IF EXISTS slv.idx_bed_profile_cycle;
-- DROP INDEX IF EXISTS slv.idx_bed_profile_valve;
-- DROP INDEX IF EXISTS slv.idx_valve_profile_cycle;
-- DROP INDEX IF EXISTS mdl.idx_vegetativo_activity_date;
-- DROP INDEX IF EXISTS mdl.idx_vegetativo_cycle_activity;
-- DROP INDEX IF EXISTS public.idx_users_username;
