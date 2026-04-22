# Gestion - Calidad - Punto de apertura

## Contexto funcional

El dashboard `Dashboard > Calidad > Punto de apertura` consolida el analisis de homogeneidad de apertura construido originalmente en:

`C:\Users\paul.loja\PYPROYECTOS\calidad\punto_apertura`

La fuente primaria es PostgreSQL:

- Tabla base: `hist.temp_monitoreo_verde`
- Calendario: `slv.common_dim_calendar_date_scd0`
- Perfil de ciclo: `slv.camp_dim_cycle_profile_scd2`

El objetivo es evaluar, a nivel de registro/malla, que tan concentrada esta la apertura en una sola clase dominante. Esto permite separar registros `Homogeneo` y `No homogeneo` con una regla estadistica macro.

## Regla de datos

Para cada `ciclo`, se identifica la primera `fecha` donde existe apertura real:

```sql
coalesce(ptoapertura_boton, 0)
+ coalesce(ptoapertura_1a3, 0)
+ coalesce(ptoapertura_4a9, 0)
+ coalesce(ptoapertura_10a20, 0)
+ coalesce(ptoapertura_mas20, 0) > 0
```

Desde esa fecha en adelante, el ciclo entra al analisis.

## Indicador principal

Por registro se calcula:

```text
total_apertura = boton + 1a3 + 4a9 + 10a20 + mas20
valor_dominante = max(boton, 1a3, 4a9, 10a20, mas20)
participacion_dominante_pct = valor_dominante / total_apertura
```

La clase asociada al valor maximo se guarda como `dominante_clase`.

## Baseline macro fijo

La media, desviacion y limite inferior no cambian con los filtros de pantalla. Son una referencia macro historica calculada sobre toda la base util.

```text
media_macro = promedio(participacion_dominante_pct)
desviacion_macro = desviacion_estandar_muestral(participacion_dominante_pct)
limite_inferior = media_macro - desviacion_macro
```

Con la primera validacion sobre la base real, el orden de magnitud fue:

- Media macro aproximada: `94%`
- Desviacion aproximada: `9%`
- Limite inferior aproximado: `85%`

La pantalla recalcula estos valores desde PostgreSQL para evitar quemar constantes en codigo.

## Estado del registro

```text
Homogeneo = participacion_dominante_pct >= limite_inferior
No homogeneo = participacion_dominante_pct < limite_inferior
```

## Filtros

Los filtros disponibles son:

- Semana ISO: desde `slv.common_dim_calendar_date_scd0.iso_week_id`
- Anio: desde `hist.temp_monitoreo_verde.fecha`
- Mes registro: desde `hist.temp_monitoreo_verde.fecha`
- Area: desde `slv.camp_dim_cycle_profile_scd2.area_id`
- Tipo SP: desde `slv.camp_dim_cycle_profile_scd2.sp_type`
- Dominante: clase dominante del registro (`Boton`, `1 a 3`, `4 a 9`, `10 a 20`, `Mas de 20`)

## Vista principal

La vista incluye:

- KPIs macro: media macro, desviacion macro, limite inferior, % homogeneos, % no homogeneos.
- Composicion visible por punto de apertura: participacion agregada de boton, 1 a 3, 4 a 9, 10 a 20 y mas de 20 sobre el total filtrado.
- Carta de control por registro: puntos coloreados por estado.
- Tabla de registros no homogeneos recientes.

El grafico usa los ultimos registros visibles para conservar fluidez en navegador, mientras los KPIs se calculan sobre todo el filtro.

## Drill-down

Al hacer click en un punto o fila se abre un `DialogShell` con:

- Participacion completa por punto de apertura.
- Conteo por clase.
- Dominante y estado.
- Fecha, ciclo, bloque, area, tipo SP, semana ISO, anio y mes de registro.

## Archivos principales

- `src/lib/calidad-punto-apertura.ts`
- `src/app/api/calidad/punto-apertura/route.ts`
- `src/app/(dashboard)/dashboard/calidad/punto-apertura/page.tsx`
- `src/modules/calidad/components/punto-apertura-page.tsx`
- `src/modules/calidad/components/punto-apertura-explorer.tsx`
- `src/modules/calidad/components/punto-apertura-control-chart.tsx`
- `src/modules/calidad/components/punto-apertura-record-overlay.tsx`

## Seguridad

La API esta registrada en `src/lib/access-control.ts`:

```text
/api/calidad/punto-apertura -> /dashboard/calidad/punto-apertura
```

El acceso a pagina usa `loadProtectedPageData` con el recurso:

```text
/dashboard/calidad/punto-apertura
```

## Control de cambios

### 2026-04-22 - Version 0.1.0

Cambios realizados:

- Se creo el dominio visual `Calidad` en Dashboard y Gestion.
- Se agrego la ruta `Dashboard > Calidad > Punto de apertura`.
- Se implemento API protegida para el dashboard.
- Se implemento la capa de lectura PostgreSQL y calculo de indicadores.
- Se agrego baseline macro fijo: media, desviacion y limite inferior.
- Se agregaron filtros por semana ISO, anio, mes de registro, area, tipo SP y clase dominante.
- Se agrego carta de control por registro con click a detalle.
- Se agrego overlay de detalle con participacion real por punto de apertura.
- Se agregaron tarjetas de composicion visible por punto de apertura.
- Se registro la API en RBAC.

Validacion:

- `npm run typecheck`
- `npm run build`

Pendientes sugeridos:

- Definir si el baseline macro se congelara en una tabla oficial o seguira recalculandose sobre la base historica.
- Evaluar si se requiere un AQL por clase dominante cuando el proceso tenga suficiente validacion operativa.
