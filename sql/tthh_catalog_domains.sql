-- Dominios gobernados para catálogos TTHH.
-- Permite saber a qué formulario/proceso pertenece cada catálogo.

create table if not exists public.common_dim_catalog_domain_cur (
  domain_code text primary key,
  domain_name text not null,
  domain_description text,
  module_code text not null default 'tthh',
  display_order integer not null default 0,
  is_valid boolean not null default true,
  loaded_at timestamptz not null default now(),
  run_id text not null default 'corex_tthh_catalog_domains',
  actor_id text,
  change_reason text not null default 'manual_update'
);

alter table public.common_dim_catalog_group_scd2
  add column if not exists domain_code text not null default 'general';

create index if not exists ix_catalog_group_domain_current
  on public.common_dim_catalog_group_scd2 (domain_code, catalog_code)
  where is_current = true;

insert into public.common_dim_catalog_domain_cur (
  domain_code, domain_name, domain_description, module_code, display_order, run_id, change_reason
) values
  ('seguimiento_trabajo_social', 'Seguimiento Trabajo Social', 'Catálogos usados por el formulario de seguimientos de Trabajo Social AGR/ADM.', 'tthh', 10, 'seed_tthh_catalog_domains_v1', 'initial_load'),
  ('talento_humano_general', 'Talento Humano General', 'Catálogos reutilizables generales de Talento Humano.', 'tthh', 20, 'seed_tthh_catalog_domains_v1', 'initial_load')
on conflict (domain_code) do update set
  domain_name = excluded.domain_name,
  domain_description = excluded.domain_description,
  module_code = excluded.module_code,
  display_order = excluded.display_order,
  is_valid = true,
  loaded_at = now(),
  run_id = excluded.run_id,
  change_reason = excluded.change_reason;

update public.common_dim_catalog_group_scd2
set domain_code = 'seguimiento_trabajo_social',
    loaded_at = now(),
    run_id = 'seed_tthh_catalog_domains_v1',
    change_reason = 'manual_update'
where catalog_code in (
  'employee_followup_change_reason',
  'employee_followup_invalid_reason',
  'followup_route',
  'followup_route_source',
  'agr_followup_frequency',
  'adm_followup_frequency',
  'work_difficulty',
  'treatment_rating',
  'work_like_most',
  'improvement_opportunity',
  'retention_intention',
  'short_retention_reason',
  'hr_support_need',
  'family_pregnancy_relation',
  'yes_no',
  'inconvenience_activity',
  'inconvenience_type',
  'adaptation_response',
  'satisfaction_level',
  'work_aspect_to_improve'
)
and is_current = true;
