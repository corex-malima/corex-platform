-- ============================================================================
-- CoreX Administracion Maestros - Metas & Objetivos
-- Idempotente. Aplicar contra la base principal del sistema.
-- ============================================================================

create schema if not exists adm;

create table if not exists adm.adm_ref_goal_metric_core_scd2 (
  metric_id bigserial primary key,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_current boolean not null default true,
  is_valid boolean not null default true,
  loaded_at timestamptz not null default now(),
  run_id text,
  actor_id text,
  change_reason text not null default 'initial_load',
  constraint ux_goal_metric_core_version unique (metric_id, valid_from)
);
create index if not exists ix_goal_metric_core_current on adm.adm_ref_goal_metric_core_scd2 (metric_id, is_current);

create table if not exists adm.adm_dim_goal_metric_profile_scd2 (
  metric_id bigint not null references adm.adm_ref_goal_metric_core_scd2(metric_id),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_current boolean not null default true,
  is_valid boolean not null default true,
  metric_code text not null,
  metric_name text not null,
  metric_description text,
  metric_type text,
  unit_of_measure text,
  value_format text,
  direction text,
  source_schema text,
  source_object text,
  source_value_column text,
  formula_sql text,
  attributes_jsonb jsonb not null default '{}'::jsonb,
  loaded_at timestamptz not null default now(),
  run_id text,
  actor_id text,
  change_reason text not null default 'initial_load',
  primary key (metric_id, valid_from),
  constraint chk_goal_metric_direction check (direction is null or direction in ('higher_is_better','lower_is_better','target_is_better'))
);
create index if not exists ix_goal_metric_profile_current on adm.adm_dim_goal_metric_profile_scd2 (metric_id, is_current);
create unique index if not exists ix_goal_metric_profile_code_current on adm.adm_dim_goal_metric_profile_scd2 (metric_code) where is_current = true and is_valid = true;

create table if not exists adm.adm_ref_goal_objective_core_scd2 (
  objective_id bigserial primary key,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_current boolean not null default true,
  is_valid boolean not null default true,
  loaded_at timestamptz not null default now(),
  run_id text,
  actor_id text,
  change_reason text not null default 'initial_load',
  constraint ux_goal_objective_core_version unique (objective_id, valid_from)
);
create index if not exists ix_goal_objective_core_current on adm.adm_ref_goal_objective_core_scd2 (objective_id, is_current);

create table if not exists adm.adm_dim_goal_objective_profile_scd2 (
  objective_id bigint not null references adm.adm_ref_goal_objective_core_scd2(objective_id),
  parent_objective_id bigint,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_current boolean not null default true,
  is_valid boolean not null default true,
  objective_code text not null,
  objective_name text not null,
  objective_description text,
  objective_type text,
  objective_status text,
  owner_area_id bigint,
  owner_person_id bigint,
  period_grain text,
  period_start date,
  period_end date,
  weight numeric,
  attributes_jsonb jsonb not null default '{}'::jsonb,
  loaded_at timestamptz not null default now(),
  run_id text,
  actor_id text,
  change_reason text not null default 'initial_load',
  primary key (objective_id, valid_from)
);
create index if not exists ix_goal_objective_profile_current on adm.adm_dim_goal_objective_profile_scd2 (objective_id, is_current);
create index if not exists ix_goal_objective_profile_parent on adm.adm_dim_goal_objective_profile_scd2 (parent_objective_id);
create unique index if not exists ix_goal_objective_profile_code_current on adm.adm_dim_goal_objective_profile_scd2 (objective_code) where is_current = true and is_valid = true;

create table if not exists adm.adm_ref_goal_target_core_scd2 (
  target_id bigserial primary key,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_current boolean not null default true,
  is_valid boolean not null default true,
  loaded_at timestamptz not null default now(),
  run_id text,
  actor_id text,
  change_reason text not null default 'initial_load',
  constraint ux_goal_target_core_version unique (target_id, valid_from)
);
create index if not exists ix_goal_target_core_current on adm.adm_ref_goal_target_core_scd2 (target_id, is_current);

create table if not exists adm.adm_dim_goal_target_profile_scd2 (
  target_id bigint not null references adm.adm_ref_goal_target_core_scd2(target_id),
  objective_id bigint,
  metric_id bigint not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_current boolean not null default true,
  is_valid boolean not null default true,
  target_code text not null,
  target_name text not null,
  target_description text,
  period_grain text,
  period_start date not null,
  period_end date not null,
  target_operator text not null,
  target_value numeric,
  target_min_value numeric,
  target_max_value numeric,
  baseline_value numeric,
  unit_of_measure text,
  value_format text,
  weight numeric,
  attributes_jsonb jsonb not null default '{}'::jsonb,
  loaded_at timestamptz not null default now(),
  run_id text,
  actor_id text,
  change_reason text not null default 'initial_load',
  primary key (target_id, valid_from),
  constraint chk_goal_target_operator check (target_operator in ('>=','<=','=','between','outside')),
  constraint chk_goal_target_period check (period_end >= period_start)
);
create index if not exists ix_goal_target_profile_current on adm.adm_dim_goal_target_profile_scd2 (target_id, is_current);
create unique index if not exists ix_goal_target_profile_code_current on adm.adm_dim_goal_target_profile_scd2 (target_code) where is_current = true and is_valid = true;
create index if not exists ix_goal_target_profile_objective on adm.adm_dim_goal_target_profile_scd2 (objective_id);
create index if not exists ix_goal_target_profile_metric on adm.adm_dim_goal_target_profile_scd2 (metric_id);

create table if not exists adm.adm_asgn_goal_target_dimension_scd2 (
  target_id bigint not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  is_current boolean not null default true,
  is_valid boolean not null default true,
  dimension_level int not null,
  dimension_type text not null,
  dimension_key text not null,
  dimension_label text,
  attributes_jsonb jsonb not null default '{}'::jsonb,
  loaded_at timestamptz not null default now(),
  run_id text,
  actor_id text,
  change_reason text not null default 'initial_load',
  primary key (target_id, dimension_type, dimension_key, valid_from)
);
create index if not exists ix_goal_target_dimension_current on adm.adm_asgn_goal_target_dimension_scd2 (target_id, is_current);
create index if not exists ix_goal_target_dimension_level on adm.adm_asgn_goal_target_dimension_scd2 (target_id, dimension_level);
create index if not exists ix_goal_target_dimension_lookup on adm.adm_asgn_goal_target_dimension_scd2 (dimension_type, dimension_key);

