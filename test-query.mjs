import pg from 'pg';
const { Client } = pg;

const c = new Client({
  host: '10.0.2.70', port: 5432,
  database: 'datalakehouse',
  user: 'db_admin', password: 'edramerl1403', ssl: false,
});

await c.connect();

// 1. Columnas de la tabla
const cols = await c.query(`
  select column_name, data_type
  from information_schema.columns
  where table_schema = 'mdl'
    and table_name   = 'prod_ref_vegetativo_subset_scd2'
  order by ordinal_position
`);
console.log('=== COLUMNAS ===');
console.table(cols.rows);

// 2. Muestra de 5 filas con SPMC o ILUMINACION
const sample = await c.query(`
  select activity_code, event_date, block_id, cycle_key
  from mdl.prod_ref_vegetativo_subset_scd2
  where activity_code in ('SPMC','ILUMINACION')
  limit 5
`);
console.log('\n=== SAMPLE DATA ===');
console.table(sample.rows);

// 3. Conteo por activity_code
const counts = await c.query(`
  select activity_code, count(*) as total,
         min(event_date) as min_date, max(event_date) as max_date
  from mdl.prod_ref_vegetativo_subset_scd2
  where activity_code in ('SPMC','ILUMINACION')
  group by activity_code
`);
console.log('\n=== CONTEOS ===');
console.table(counts.rows);

await c.end();
