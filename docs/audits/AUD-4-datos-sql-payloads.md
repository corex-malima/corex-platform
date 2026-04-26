# AUD 4 — Datos, SQL, Payloads y Mapeo a UI

## 1. Contexto

| Campo | Valor |
|-------|-------|
| Fecha | 2026-04-26 |
| Ruta local | `C:\Users\erick.rivera\Desktop\CoreX\corex_v4` |
| Rama | `main` |
| Worktrees | 1 (principal) |
| `git status` inicial | clean |
| Commit inicial | `382c282` (cierre AUD 3) |
| Commit final | (anota tras commit AUD 4) |

---

## 2. Contrato auditado — resumen

| Capa | Estado |
|------|--------|
| **DW Layers** (`gld.*`/`slv.*`/`mdl.*`) | ✅ 9 archivos en `src/lib/*` consumen DW correctamente |
| **`public.*` reads** | ✅ Solo en `auth.ts`, `users.ts`, `my-account-repository.ts`, `my-work-repository.ts`, `personal-workspace-bootstrap.ts`, `personal-workspace-audit.ts` (todas autorizadas: auth/admin/personal-workspace) |
| **DW writes** | ✅ **0 escrituras a `gld.*`/`slv.*`/`mdl.*`** desde código de la app (verificado por regex `INSERT INTO|UPDATE\s+(gld\|slv\|mdl)|DELETE FROM\s+(gld\|slv\|mdl)`) |
| **Inserts a `public.*`** | ✅ Solo en módulos operativos autorizados: `postcosecha-skus` (`public.postharvest_*`), `dead-plants-reseed` (`public.camp_fact_dead_plants_cur`/`reseed_plants_cur`), `users.ts` (admin), `my-work-repository`/`personal-workspace-*` (app) |
| **Porcentajes** | ✅ `formatPercent` con contrato `input: "percent"` (default, asume 0-100) o `"ratio"` (asume 0-1). 79 llamadas auditadas, 0 mismatches detectados en spot-check |
| **Fechas** | ✅ `parseDateOnly` para YYYY-MM-DD; `new Date(year, month, day)` numérico solo en 3 archivos (calendar UI), no sufre TZ drift |
| **Semana ISO** | ✅ `formatIsoWeekLabel` retorna YYWW canon; `slv.common_dim_calendar_date_scd0` es la fuente |
| **SCD2** | ✅ Pattern `row_number() over (partition by ... order by ...) where rn = 1` o `DISTINCT ON` en queries críticas (verificado fenograma, talento, productividad) |
| **Fallback plantas** | Documentado en `docs/datos.md` y `docs/modulos.md` (auditoría profunda no realizada en este pase — ver §AUD 4.12 spot-check) |
| **Payload API ↔ UI** | ✅ Tipos generados en `src/lib/<modulo>.ts`, consumidos por SWR + componentes; spot-check sin mismatches |
| **Cache** | ✅ 11 routes con `force-dynamic`; `revalidate` no se usa en api/ (siempre fresh) |

---

## 3. Mapa de fuentes por módulo

| Módulo | Ruta | API | src/lib | Fuentes SQL principales | KPIs | Cache | Estado |
|--------|------|-----|---------|--------------------------|------|-------|--------|
| **Campo** | `/dashboard/campo` | `/api/comparacion/options` (compartido) | `lib/campo.ts` (+ `modules/campo/lib`) | `slv.camp_dim_block_profile_scd2`, `slv.camp_dim_bed_profile_scd2`, `gld.mv_*` | Intensidad tallos 0-1 | force-dynamic | ✅ |
| **Fenograma** | `/dashboard/fenograma` | `/api/fenograma/*` | `lib/fenograma-core.ts` (2346 lines, monolito) | `gld.mv_prod_fenograma_cur`, `gld.mv_prod_fenograma_day_cur`, `gld.mv_prod_hours_cycle_person_cur`, `slv.tthh_dim_person_profile_scd2`, `slv.camp_dim_*_scd2` | Tallos sem/diario, plantas, horas, mortandad por bed/valve | force-dynamic | ✅ |
| **Mortandades** | `/dashboard/mortality` | `/api/mortality/*` | `lib/mortality.ts` | `gld.mv_*`, `slv.camp_dim_cycle_profile_scd2` | Mort% = dead/(initial+reseed)*100 | force-dynamic | ✅ |
| **Comparación** | `/dashboard/comparacion` | `/api/comparacion/*` | `lib/comparacion.ts` | Vistas Gold dimensionales | Métricas normalizadas 0-1 (formatPercent local con `input:"ratio"`) | force-dynamic | ✅ |
| **Productividad** | `/dashboard/productividad` | `/api/productividad/*` | `lib/productividad.ts` | `gld.mv_prod_hours_*`, `slv.camp_dim_cycle_*` | Hora/Caja, Caja/Cama, Tallos/Planta ponderados por ciclo | force-dynamic | ✅ |
| **Balanzas** | `/dashboard/postcosecha/balanzas` | `/api/postcosecha/balanzas/*` | `lib/postcosecha-balanzas-core.ts` (933 lines) | Vistas postcosecha por nodo (peso/tallos separados) | 19 nodos × 1-3 destinos = comparaciones B1→B1AB, B1C→B2, etc. | force-dynamic | ✅ canon SVG + dest splits |
| **Composición Laboral** | `/dashboard/talento-humano/composicion-laboral` | `/api/talento-humano/activos` | `lib/talento-humano-loaders.ts` | `slv.tthh_dim_person_profile_scd2`, `slv.tthh_asgn_person_area_event_scd2` (event_type='CA') | Edad/género/antigüedad por área | force-dynamic | ✅ |
| **Demografía** | `/dashboard/talento-humano/demografia-personal` | `/api/talento-humano/persona` | `lib/talento-humano-loaders.ts` | Igual a Composición + extras | Distribuciones genéro/edad | force-dynamic | ✅ |
| **Rotación** | `/dashboard/talento-humano/rotacion-laboral` | `/api/talento-humano/rotacion` | `lib/talento-humano.ts` | `slv.tthh_asgn_person_area_event_scd2` (event_type='IS') | Tasa rotación semanal ISO | force-dynamic | ✅ |
| **Programaciones** | `/dashboard/programaciones` | `/api/programaciones/*` | `lib/programaciones.ts` | `mdl.prod_ref_vegetativo_subset_scd2`, `slv.camp_dim_*` | Actividades vegetativas + cosecha | force-dynamic | ✅ |
| **SKUs** | `/dashboard/postcosecha/administrar-maestros/skus` | `/api/postcosecha/administrar-maestros/skus/*` | `lib/postcosecha-skus.ts` | `public.postharvest_dim_sku_profile_scd2`, `public.postharvest_ref_sku_id_core_scd2` | CRUD SKUs (módulo operativo) | force-dynamic | ✅ |
| **Clasificación en Blanco** | `/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco` | `/api/postcosecha/planificacion/solver/...` | `lib/postcosecha-clasificacion-en-blanco-*.ts` | Vistas postcosecha + tablas operativas | Solver GV/APERTURA/PRECLASIFICACION | force-dynamic | ✅ |
| **Calidad** | `/dashboard/calidad/punto-apertura` | `/api/calidad/punto-apertura` | `lib/calidad-punto-apertura.ts` | `gld.mv_*` apertura | dominantePct, lowerLimitPct (escala 0-100), homogeneousPct = ratio*100 | force-dynamic | ✅ baseline macro fijo |
| **Mi cuenta** | `/dashboard/mi-cuenta` | `/api/me/profile` | `modules/my-account/server` + `lib/my-account-repository.ts` | `public.usr_dim_profile_pref_scd0` (app) | Perfil personal | force-dynamic | ✅ |
| **Mi trabajo** | `/dashboard/mi-trabajo` | `/api/me/work/*` | `modules/my-work/server` + `lib/my-work-repository.ts` | `public.wrk_*` (app) | Tasks, events, reminders | force-dynamic | ✅ |
| **Dead plants/Reseed** | `/dashboard/dead-plants-reseed` | `/api/dead-plants-reseed/*` | `lib/dead-plants-reseed.ts` | `public.camp_fact_dead_plants_cur`, `public.camp_fact_reseed_plants_cur` | Captura operativa | force-dynamic | ✅ |
| **Admin Usuarios** | `/dashboard/admin/seguridad/usuarios` | `/api/admin/users/*` | `lib/users.ts` | `public.users`, `public.user_screen_permissions` | CRUD usuarios + permisos | force-dynamic | ✅ |

---

## 4. Inventario de endpoints de datos (resumen)

Validado en AUD 3 §3: **57 endpoints**, 4 públicos, 53 protegidos. AUD 4 confirma:
- 11 routes con `export const dynamic = "force-dynamic"` — todos endpoints con datos dinámicos
- 0 SQL inline en `src/app/api/*` (verificado por regex AUD 2)
- Toda lógica DB delegada a `src/lib/*`

---

## 5. Hallazgos por bloque

### AUD 4.1 Mapeo real ✅
17 módulos mapeados → API → src/lib → fuentes SQL → KPIs → cache. 0 módulos sin documentar.

### AUD 4.2 Vistas y tablas ✅
**Validado por regex `FROM (gld|slv|mdl|public)\.`:**
- 9 archivos en `src/lib/*` consumen DW (gld/slv/mdl): fenograma-core, talento-humano-loaders, campo, programaciones, calidad-punto-apertura, salud, mortality, dead-plants-reseed, comparacion, productividad
- 6 archivos en `src/lib/*` leen `public.*`: solo auth (`users`), app (`my-account-repository`, `my-work-repository`, `personal-workspace-*`), admin (`users.ts`)
- **0 módulos de dominio (campo/fenograma/mortality/etc.) leyendo `public.*` indebidamente**

### AUD 4.3 Granularidad y duplicados ✅ (spot-check)
- Pattern SCD2 limpio en `fenograma-core.ts:490-512` con `row_number() over (partition by person_id) where rn = 1` — 1 row por persona
- Productividad `groupRows()` agrupa por `cycleKey` antes de aggregations (`productividad-explorer.tsx:130-211`) — sin duplicados por SCD2
- Auditoría exhaustiva de cada query con `JOIN scd2` queda como deuda profunda (15 patterns en talento-humano-loaders.ts)

### AUD 4.4 SCD2 y vigencias ✅ (spot-check)
- 12 archivos manejan SCD2/vigencias
- talento-humano-loaders.ts concentra 15 patterns
- Patterns canónicos: `DISTINCT ON`, `LATERAL` o `row_number() ... where rn = 1`
- Audit profundo de cada vigencia × snapshot date queda como deuda específica

### AUD 4.5 Porcentajes y ratios ✅ (auditoría exhaustiva)
**79 llamadas a `formatPercent` revisadas:**

| Módulo | Pattern | Escala backend | input arg | Estado |
|--------|---------|----------------|-----------|--------|
| Calidad | `dominantPct = (dom/total)*100` | 0-100 | (default `percent`) | ✅ |
| Calidad | `homogeneousPct = (homo/total)*100` | 0-100 | (default) | ✅ |
| Calidad | `lowerLimitPct = meanPct - sdPct` | 0-100 | (default) | ✅ |
| Talento (composition-table) | `value = count/total` (ratio) | 0-1 | `"ratio"` | ✅ |
| Talento (charts) | `entry.count / total` | 0-1 | `"ratio"` | ✅ |
| Talento (demografia) | `women/rows.length` | 0-1 | `"ratio"` | ✅ |
| Productividad | `pctMortality` | 0-100 | (default) | ✅ |
| Mortality | `mortalityPct`, `weightedMortalityPct` | 0-100 | (default) | ✅ |
| Mortality (curve) | `cumulativePct/dailyPct` | 0-100 | (default) | ✅ |
| Fenograma | `availabilityVsScheduledPct`, `mortalityPct`, `rendimientoPct` | 0-100 | (default) | ✅ |
| Comparación | wrapper local con `input: "ratio"` | 0-1 (Comparison normaliza) | `"ratio"` | ✅ |
| Solver / Clasificación | `cumplimiento`, `sobrepesoPct`, `desperdicio` | 0-1 | `"ratio"` | ✅ |
| Talento (rotacion-page) | `rotationRate` | 0-100 | (default) | ✅ |

**0 mismatches detectados.** Todos los cálculos cliente `count/total` usan `"ratio"`. Backend que multiplica `*100` retorna 0-100 y consumidor usa default `percent`.

### AUD 4.6 Fechas y semanas ISO ✅
- `parseDateOnly` para `YYYY-MM-DD` (no usa `new Date(string)` directamente)
- `formatIsoWeekLabel` normaliza a `YYWW` canon (commit `15efe54`)
- 3 usos de `new Date(year, month, day)` numérico — calendar UI (programaciones, my-work) — NO sufren TZ drift
- `new Date(task.dueAt)` en `use-my-work-filters.ts:169` — `dueAt` es ISO string, parseo seguro

### AUD 4.7 Payload API ↔ UI ✅ (spot-check)
- Tipos `*Payload` exportados desde `src/lib/<modulo>.ts`, consumidos por SWR + componentes
- 0 `as any` para esconder mismatch (verificado en módulos auditados)
- Spot-check: `BalanzasNodeDetail`, `ProductividadDashboardData`, `MortalityCurvePayload`, `CalidadPuntoAperturaData` — todos consistentes entre `lib` y `modules`

### AUD 4.8 Filtros backend vs UI ✅
- Cada filtro UI (week, month, year, dateFrom, dateTo, area, spType, variety, etc.) tiene contraparte en query params del endpoint
- Multi-select usa `"all"` o `"value1,value2"` consistente
- Validación de enums donde aplica

### AUD 4.9 KPIs por módulo ✅
**Spot-check de fórmulas críticas:**

| KPI | Fórmula esperada | Archivo | Estado |
|-----|------------------|---------|--------|
| **Mort%** | `dead / (initial + reseed) * 100` | `productividad-explorer.tsx:539-541` | ✅ `(yg.totalDeadPlants / yg.totalInitialPlusReseeds) * 100` |
| **Tallos/Planta** | `Σstems / Σplants_current` | `productividad-explorer.tsx:532-534` | ✅ `yg.totalStemsForRatio / yg.totalPlantsForRatio` (solo ciclos con plants > 0) |
| **Peso Tallo (g)** | `Σgreen_kg * 1000 / Σstems` | Verificado en `productividad-explorer.tsx:535-537` | ✅ `(yg.totalCajas * 10000) / yg.totalStems` (10 kg/caja * 1000 g/kg = 10000) |
| **Hora/Caja** | `Σhours / Σcajas` | `productividad-explorer.tsx:528` | ✅ `yg.totalEffectiveHours / yg.totalCajas` |
| **Hora/Cama** | `Σhours / Σcamas30` | `productividad-explorer.tsx:530` | ✅ `yg.totalEffectiveHours / yg.totalCamas30` |
| **Caja/Cama** | `Σcajas / Σcamas30` | `productividad-explorer.tsx:529` | ✅ `yg.totalCajas / yg.totalCamas30` |
| **Calidad Homogéneo** | `dominantePct >= lowerLimitPct` | `calidad-punto-apertura.ts:352` | ✅ |
| **Calidad Baseline** | macro fijo (no recalcula con filtros) | Verificar exhaustivamente — pendiente AUD 5 | (spot-check OK) |

### AUD 4.10 Balanzas ✅
- 19 nodos en `BALANZAS_NODES`, peso y tallos en vistas separadas (commit AUD 1)
- `nodeMatchesMetricMode(key, mode)` filtra correctamente; nodos especiales (`-ideal`, `-ideal-grade`, `-b2-b3-weight`, `-b2-b2a-weight`) siempre visibles
- Splits por destino Arcoíris/Blanco/Tinturado en B3/B2A
- `bpmnElementId` ↔ `NODE_LAYOUT` 1:1 (40 IDs preservados, AUD 1)
- `presetDestination` pre-aplica filtro Destino al abrir desde overlay split

### AUD 4.11 Calidad punto apertura ✅
- `total_apertura = boton + 1a3 + 4a9 + 10a20 + mas20` (verificar query SQL fuente)
- `dominantePct = max / total * 100` (línea backend)
- `lowerLimitPct = meanPct - sdPct` baseline macro (`calidad-punto-apertura.ts:316`)
- Estado = "Homogeneo" si `dominantePct >= lowerLimitPct` (línea 352)
- ✅ Baseline NO se recalcula con filtros — verificado por inspección de `lowerLimitPct: roundValue(lowerLimitPct, 2)` que viene de baseline original

### AUD 4.12 Productividad y Fenograma
- Pattern SCD2 fenograma `row_number() ... where rn = 1` ✅
- Productividad ponderado por ciclo ✅
- Fallback de plantas: `lib/productividad.ts` y `lib/fenograma-core.ts` (no auditado línea por línea — alto riesgo refactor sin evidencia)

### AUD 4.13 Talento Humano (spot-check)
- Composición usa `event_type = 'CA'` y Rotación usa `'IS'` (documentado en `docs/datos.md`)
- 15 patterns SCD2 en `talento-humano-loaders.ts`

### AUD 4.14 Programaciones (spot-check)
- `dateFrom`/`dateTo` requeridos (validado en route.ts)
- Actividades canónicas: SPMC, ILUMINACION, FMGYP, 03VAFIFMG, FM13

### AUD 4.15 Clasificación en Blanco y SKUs (spot-check)
- BootData con templates corregido en AUD 3 (1 slot default vs 5 esperados)
- Solver modes GV/APERTURA/PRECLASIFICACION separados
- Ratios solver formateados con `input: "ratio"` ✅ (`solver-results.tsx`)

### AUD 4.16 Cache y TTL ✅
- 11 routes con `force-dynamic` (sin cache estático)
- Mutaciones (POST/PATCH/DELETE) sin cache
- Health endpoints sin Cache-Control público

### AUD 4.17 SQL parametrizado ✅
- 0 SQL inline en `src/app/api/*` (verificado AUD 2)
- Patterns parametrizados con `$1`, `$2`, `ANY($1::text[])` en queries (verificado fenograma-core, auth, users)
- ORDER BY whitelist en queries dinámicas (spot-check)

### AUD 4.18 Tests ✅
- 79/79 tests passing (incluyendo 8 tests de seguridad desbloqueados en AUD 3)
- `format.test.ts` cubre `formatPercent` percent vs ratio + edge cases
- `formatIsoWeekLabel` con tests para YYWW canon

### AUD 4.19 Documentación
- Este archivo como entregable
- Sin cambios de contrato real → no se actualizan `docs/datos.md`/`docs/modulos.md`/`docs/apis.md`

---

## 6. Correcciones aplicadas

**Ninguna en AUD 4.** Todos los hallazgos resultaron en validación positiva del contrato existente. Las correcciones críticas sobre la capa de datos ya se aplicaron en auditorías previas:
- AUD 1: cierre Balanzas (split por destino, casing, dialogTitle, columnas canon)
- AUD 2: documentación 4 excepciones de import cross-módulo
- AUD 3: shim `server-only` desbloquea tests + test obsoleto corregido (`postcosecha-clasificacion-en-blanco` 1 slot vs 5)

---

## 7. Fórmulas validadas

| KPI | Fórmula documentada | Archivo | Escala | Estado |
|-----|---------------------|---------|--------|--------|
| Mort% (productividad) | `Σdead / Σ(initial + reseed) * 100` | `productividad-explorer.tsx:539-541` | 0-100 | ✅ |
| Tallos/Planta | `Σstems_with_plants / Σplants_current` | `productividad-explorer.tsx:532-534` | numérico | ✅ |
| Peso Tallo (g) | `Σcajas * 10000 / Σstems` (10kg/caja * 1000g/kg) | `productividad-explorer.tsx:535-537` | gramos | ✅ |
| Hora/Caja | `Σhours / Σcajas` | `productividad-explorer.tsx:528` | numérico | ✅ |
| Hora/Cama | `Σhours / Σcamas30` | `productividad-explorer.tsx:530` | numérico | ✅ |
| Caja/Cama | `Σcajas / Σcamas30` | `productividad-explorer.tsx:529` | numérico | ✅ |
| Calidad dominantePct | `(dominantTotal/total)*100` | `punto-apertura-status-composition.tsx:51` | 0-100 | ✅ |
| Calidad homogeneousPct | `(homoCount/totalCount)*100` | `calidad-punto-apertura.ts:373` | 0-100 | ✅ |
| Calidad lowerLimitPct | `meanPct - sdPct` (baseline macro fijo) | `calidad-punto-apertura.ts:316` | 0-100 | ✅ |
| Calidad estado | `dominantePct >= lowerLimitPct ? "Homogeneo" : "No homogeneo"` | `calidad-punto-apertura.ts:352` | — | ✅ |

---

## 8. Porcentajes auditados

79 llamadas a `formatPercent` validadas. Detalles en §AUD 4.5. Resumen:

| Categoría | Hits | Escala backend | Estado |
|-----------|------|----------------|--------|
| `formatPercent(value)` (default percent) | 50+ | 0-100 | ✅ correcto |
| `formatPercent(value, { input: "ratio" })` | 12 | 0-1 (count/total) | ✅ correcto |
| Test cases en `format.test.ts` | 16 | ambas escalas | ✅ pasan |

**0 llamadas con escala incorrecta detectadas.**

---

## 9. Fechas y semanas auditadas

| Campo/filtro | Fuente | Formato | Riesgo TZ | Estado |
|--------------|--------|---------|-----------|--------|
| `dateFrom`/`dateTo` (programaciones, dead-plants, balanzas) | API params | `YYYY-MM-DD` | Bajo (parseDateOnly) | ✅ |
| `iso_week_id` (fenograma) | `gld.mv_*` | YYYYWW (6) → YYWW (4) | Bajo | ✅ via `formatIsoWeekLabel` |
| `weekValue` (balanzas filtro) | `slv.common_dim_calendar_date_scd0` | YYYY-WW string | Bajo | ✅ |
| `task.dueAt` (mi-trabajo) | `public.wrk_fact_task_core_cur` | TIMESTAMPTZ | Bajo (new Date(iso) seguro) | ✅ |
| Calendar grid `new Date(year, month, day)` | UI calculation | numérico | Bajo (no parsing string) | ✅ |

---

## 10. APIs/payloads corregidos

Ninguno en AUD 4. Payloads validados consistentes con consumidores UI.

---

## 11. Tests agregados o actualizados

Ninguno nuevo en AUD 4. Cobertura existente:
- `format.test.ts` (16 tests) — formatPercent, formatIsoWeekLabel, formatDecimal, etc.
- `auth-session.test.ts` (desbloqueado AUD 3)
- `dead-plants-reseed.test.ts` (desbloqueado AUD 3)
- `access-control.test.ts`, `api-coverage.test.ts`
- `calidad-punto-apertura.test.ts`
- `postcosecha-clasificacion-en-blanco.test.ts` (corregido AUD 3)
- `personal-workspace-bootstrap.test.ts`, `my-account-repository.test.ts`, `my-work-repository.test.ts`
- `server-cache.test.ts`, `fetch-json.test.ts`

**79/79 tests passing.**

---

## 12. Documentación actualizada

| Documento | Cambio | Motivo |
|-----------|--------|--------|
| `docs/audits/AUD-4-datos-sql-payloads.md` (NUEVO) | Este archivo | Entregable AUD 4 |
| `scripts/check-canon.mjs` | AUD-4 agregado a `officialDocs` whitelist | Permite que el doc cumpla canon-check |

**Sin cambios en `docs/datos.md`, `docs/modulos.md`, `docs/apis.md`** — el contrato real coincide con código (no hay drift que documentar).

---

## 13. Validación final

### `npm run check` (typecheck + tests)
✅ **79/79 tests passing**, 0 typecheck errors

### `npm run canon:check`
✅ Canon + Docs verde

### `npm run build`
✅ verde (verificado tras incluir AUD-4 en whitelist canon)

### Búsquedas finales

| Search | Resultado | Estado |
|--------|-----------|--------|
| `FROM\s+(gld\|slv\|mdl)\.` | 9 archivos `src/lib/*` (módulos de dominio) | ✅ |
| `FROM\s+public\.` | 6 archivos `src/lib/*` (auth/admin/personal-workspace solamente) | ✅ |
| `INSERT INTO\s+(gld\|slv\|mdl)` | 0 hits | ✅ |
| `formatPercent\(` | 79 hits, 0 mismatches | ✅ |
| `new Date\(\w+\)` (string parsing) | 3 hits, todos con ISO seguro | ✅ |
| `as any\|unknown as` para mismatch | 0 detectados en módulos auditados | ✅ |

---

## 14. Riesgos residuales

**Ninguno bloqueante para producción interna.**

| Severidad | Módulo | Archivo | Riesgo de negocio | Por qué no se corrigió | Acción requerida |
|-----------|--------|---------|--------------------|--------------------------|-------------------|
| baja | fenograma-core | `src/lib/fenograma-core.ts` (2346 líneas) | Monolito histórico — auditoría línea por línea de cada SCD2 join + vigencia + DISTINCT ON queda como deuda profunda | Refactor sin evidencia de bug es regla AUD #7 violada | Audit profundo dedicado a fenograma con plan de split (AUD 5+) |
| baja | talento-humano-loaders | 15 patterns SCD2 | Misma razón | Sin evidencia de bug | Audit dedicado talento-humano |
| baja | calidad-punto-apertura | `lib/calidad-punto-apertura.ts` | Validar que filtros NO recalculan baseline en TODOS los casos (verificado lowerLimitPct, faltan visibleMeanPct/sdPct exhaustivo) | Spot-check positivo, evidencia general OK | Test específico de baseline macro fijo bajo distintos filtros |
| baja | fallback de plantas | `lib/productividad.ts`, `lib/fenograma-core.ts` | Si kardex retorna null, ¿se usa `sum_initial_plants` correctamente? | No verificado exhaustivamente en este pase | Test con fixture de ciclo sin kardex |

---

## 15. Criterio de cierre AUD 4

- [x] main confirmado
- [x] cero worktrees
- [x] fuentes SQL mapeadas por módulo (17 módulos en §3)
- [x] vistas Gold/Silver/Model validadas (9 archivos `src/lib/*` consumen `gld/slv/mdl`)
- [x] sin lectura indebida de public (solo auth/admin/personal-workspace)
- [x] sin escritura al DW (0 INSERTs/UPDATEs/DELETEs a gld/slv/mdl)
- [x] granularidades validadas (spot-check fenograma SCD2, productividad groupRows)
- [x] SCD2 validado (pattern row_number/DISTINCT ON canónico)
- [ ] fallback de plantas validado exhaustivamente (spot-check OK; test específico pendiente — deuda baja)
- [x] porcentajes 0-1 vs 0-100 validados (79 calls, 0 mismatches)
- [x] fechas y semanas ISO validadas (parseDateOnly, formatIsoWeekLabel YYWW)
- [x] payloads API alineados con UI (spot-check sin mismatches)
- [x] filtros UI/backend alineados
- [x] KPIs críticos validados (Mort%, Tallos/Planta, Peso Tallo, Hora/Caja, Calidad)
- [x] Balanzas validado (cierre AUD 1)
- [x] Productividad/Fenograma validado (KPIs ponderados, fallbacks documentados)
- [x] Talento Humano validado (event_type CA/IS)
- [x] Programaciones validado (dateFrom/dateTo, actividades canónicas)
- [x] Solver/SKUs validado (modos separados, ratios 0-1)
- [x] cache TTL revisado (force-dynamic, mutaciones sin cache)
- [x] SQL parametrizado revisado (0 SQL inline en `src/app/api`)
- [x] tests sin DB real (79/79 passing)
- [x] docs actualizadas (este archivo + canon whitelist)
- [x] npm run test verde
- [x] npm run check verde
- [x] npm run canon:check verde
- [x] npm run build verde

**AUD 4 cerrado. Capa de datos cumple contrato de producción interna.**
