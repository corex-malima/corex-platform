create schema if not exists gld;

drop materialized view if exists gld.mv_camp_kardex_bed_plants_cur;
create materialized view gld.mv_camp_kardex_bed_plants_cur as
select *
from gld.vw_camp_kardex_bed_plants_cur
with data;

drop materialized view if exists gld.mv_camp_kardex_bed_plants_day_cur;
create materialized view gld.mv_camp_kardex_bed_plants_day_cur as
select *
from gld.vw_camp_kardex_bed_plants_day_cur
with data;

drop materialized view if exists gld.mv_camp_kardex_cycle_plants_cur;
create materialized view gld.mv_camp_kardex_cycle_plants_cur as
select *
from gld.vw_camp_kardex_cycle_plants_cur
with data;

drop materialized view if exists gld.mv_camp_kardex_valve_plants_cur;
create materialized view gld.mv_camp_kardex_valve_plants_cur as
select *
from gld.vw_camp_kardex_valve_plants_cur
with data;

drop materialized view if exists gld.mv_prod_fenograma_cur;
create materialized view gld.mv_prod_fenograma_cur as
select *
from gld.vw_prod_fenograma_cur
with data;

create index if not exists idx_mv_bed_block
on gld.mv_camp_kardex_bed_plants_cur(block_id);

create index if not exists idx_mv_bed_cycle
on gld.mv_camp_kardex_bed_plants_cur(cycle_key);

create index if not exists idx_mv_bed_day_block
on gld.mv_camp_kardex_bed_plants_day_cur(block_id);

create index if not exists idx_mv_bed_day_cycle
on gld.mv_camp_kardex_bed_plants_day_cur(cycle_key);

create index if not exists idx_mv_cycle_key
on gld.mv_camp_kardex_cycle_plants_cur(cycle_key);

create index if not exists idx_mv_valve_id
on gld.mv_camp_kardex_valve_plants_cur(valve_id);

create index if not exists idx_mv_fenograma_block
on gld.mv_prod_fenograma_cur(parent_block);

create index if not exists idx_mv_fenograma_cycle
on gld.mv_prod_fenograma_cur(cycle_key);
