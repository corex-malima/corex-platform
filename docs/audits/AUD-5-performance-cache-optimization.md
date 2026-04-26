# AUD 5 — Performance, Cache, Renders, Queries y Optimización Productiva

## 1. Contexto

| Campo | Valor |
|-------|-------|
| Fecha | 2026-04-26 |
| Ruta local | `C:\Users\erick.rivera\Desktop\CoreX\corex_v4` |
| Rama | `main` |
| Worktrees | 1 (principal) |
| `git status` inicial | clean |
| Commit inicial | `ccb8bb8` (cierre AUD 4) |
| Commit final | (anota tras commit AUD 5) |

---

## 2. Contrato auditado — resumen

| Capa | Estado |
|------|--------|
| **Cache-Control en APIs** | ✅ 40 endpoints declaran `Cache-Control` explícito (`private, max-age=15-300, swr=60-600` para reads; `private, no-store` para mutaciones y datos personales) |
| **Cache server (`cachedAsync`)** | ✅ Centralizado en `src/lib/server-cache.ts` con tests; keys incluyen filtros relevantes |
| **SWR / fetch cliente** | ✅ Sin `refreshInterval` ni `revalidateOnFocus: true` en módulos auditados; SWR keys con filtros serializados |
| **Queries SQL** | ✅ 0 SQL inline en `src/app/api/*`; toda lógica DB en `src/lib/*`; `SELECT *` solo en perfil personal (1 fila) y CTEs internos |
| **Re-renders** | ✅ Sin `console.log/debug/time` productivo; campos memoizados en explorers (verified spot-check) |
| **Charts pesados** | ✅ Recharts via `ChartSurface`; balanzas migrado a SVG hand-crafted (bpmn-js ya no se carga en balanzas) |
| **Tablas grandes** | ✅ `ScrollFadeTable` + `LIMIT 2000` en balanzas detalle; productividad usa lazy load por ciclo via `CycleDetailRows` |
| **Overlays bajo demanda** | ✅ `BalanzasNodeDetailDialog` con SWR `keepPreviousData`; `BlockProfileModal` lazy de paneles internos |
| **localStorage** | ✅ 4 archivos: `use-solver-draft-storage` (con tests + isResultStale), `dashboard-scale-toggle`, `theme-provider` — todos client-only |
| **Bundle / `"use client"`** | ✅ Solo 1 page con `"use client"` (login). Resto server components. Lazy dynamic imports en Campo (Leaflet 6 imports), Fenograma (bpmn-js), Mortality (curve-panel) |
| **Docker/runtime** | ✅ Build standalone, puerto 7777, env_file, TZ=UTC documentado |
| **Observabilidad** | ✅ requestId en errores; logger estructurado disponible; 4 console.error en api/ son seguros (verificado AUD 3) |

---

## 3. Mapa de performance por módulo

| Módulo | Ruta | API principal | Cache-Control | TTL | Payload | Carga pesada | Riesgo | Acción |
|--------|------|----------------|----------------|-----|---------|---------------|--------|--------|
| Dashboard root | `/dashboard` | — (server-side `getCurrentUserAccess`) | n/a | n/a | nav cards (sm) | — | bajo | OK |
| Campo | `/dashboard/campo` | `/api/comparacion/options` | `private, max-age=30, swr=120` | 30s | GeoJSON + datos bloques | Leaflet (lazy) | medio | OK lazy ✅ |
| Fenograma | `/dashboard/fenograma` | `/api/fenograma/pivot` + 8 sub-endpoints | `private, max-age=30-60, swr=120-300` | 30-60s | pivot table (med) | bpmn-js (lazy in BlockProfileModal) | medio | OK lazy ✅ |
| Mortality | `/dashboard/mortality` | `/api/mortality/*` | `private, max-age=30-60` | 30-60s | curva diaria (med) | Recharts | bajo | OK |
| Comparación | `/dashboard/comparacion` | `/api/comparacion/{options,pair}` | `private, max-age=30-60` | 30-60s | métricas pares (sm) | Recharts | bajo | OK |
| Productividad | `/dashboard/productividad` | `/api/productividad`, `/api/productividad/[cycleKey]/detail` | `private, max-age=30, swr=120` | 30s | resumen + lazy detail | tabla expandible | bajo | OK detail lazy ✅ |
| Programaciones | `/dashboard/programaciones` | `/api/programaciones`, `/api/programaciones/cycle-range/[cycleKey]` | `private, max-age=60-300, swr=300-600` | 60-300s | actividades (med) | Gantt-like chart | bajo | ✅ cycle-range cache agregada (este audit) |
| Balanzas | `/dashboard/postcosecha/balanzas` | `/api/postcosecha/balanzas`, `/api/postcosecha/balanzas/[nodeKey]` | `private, max-age=15-30` | 15-30s | summary 19 nodos + detail bajo demanda | SVG hand-crafted (no bpmn-js) | bajo | OK migrado ✅ |
| SKUs | `/dashboard/postcosecha/administrar-maestros/skus` | `/api/postcosecha/administrar-maestros/skus/*` | `private, no-store` | 0 | CRUD | tabla (sm-med) | bajo | OK |
| Clasif Blanco | `.../solver/clasificacion-en-blanco` | `/api/.../clasificacion-en-blanco/*` | `private, no-store` | 0 | solver inputs/outputs | localStorage isResultStale | bajo | OK ✅ |
| Composición Lab | `/dashboard/talento-humano/composicion-laboral` | `/api/talento-humano/activos` | `private, max-age=60, swr=120` | 60s | personas activas (lg) | heatmap densidad | medio | OK |
| Demografía | `.../demografia-personal` | `/api/talento-humano/persona` | `private, max-age=300, swr=600` | 300s | personas (lg) | charts demograficos | bajo | OK TTL alto justificado (snapshot estable) |
| Rotación | `.../rotacion-laboral` | `/api/talento-humano/rotacion` | `private, max-age=60, swr=120` | 60s | eventos IS (med) | weekly chart | bajo | OK |
| Calidad | `/dashboard/calidad/punto-apertura` | `/api/calidad/punto-apertura` | `private, max-age=30, swr=120` | 30s | records (med) | control chart Recharts | bajo | OK |
| Mi cuenta | `/dashboard/mi-cuenta` | `/api/me/profile` | `private, no-store` | 0 | perfil personal (sm) | — | bajo | OK |
| Mi trabajo | `/dashboard/mi-trabajo` | `/api/me/work/*` (10 endpoints) | `private, no-store` | 0 | tasks/events/reminders | calendar grid | bajo | OK |
| Dead plants | `/dashboard/dead-plants-reseed` | `/api/dead-plants-reseed/*` | `private, no-store` | 0 | captura operativa | — | bajo | OK |
| Admin Usuarios | `/dashboard/admin/seguridad/usuarios` | `/api/admin/users/*` | (default no-store implícito) | 0 | usuarios + permisos | tabla (sm) | bajo | OK |

---

## 4. Inventario de endpoints y cache

| Categoría | Cantidad | Cache-Control | TTL típico |
|-----------|----------|----------------|-------------|
| Reads dimensionales (resumen) | 12 | `private, max-age=30, swr=120` | 30s |
| Reads detail por cycleKey/valveId/bedId | 10 | `private, max-age=60, swr=300` | 60s |
| Reads talento-humano activos/rotacion | 2 | `private, max-age=60, swr=120` | 60s |
| Reads talento-humano persona | 2 | `private, max-age=300, swr=600` | 300s (perfil estable) |
| Reads programaciones | 2 | `private, max-age=60-300, swr=300-600` | 60-300s |
| Mutations (POST/PATCH/DELETE) | 10 | `private, no-store` | 0 |
| Personal workspace (mi-cuenta, mi-trabajo) | 11 | `private, no-store` (helper `_shared.ts`) | 0 |
| Auth (login/logout/me) | 3 | (sin header explícito; `force-dynamic`) | 0 |
| Health | 2 | (sin header; `force-dynamic`) | 0 |
| Admin | 2 | (default; sin cache pública) | 0 |

**0 endpoints con cache pública.** Todos `private` o ausente con `force-dynamic`.

---

## 5. Hallazgos por bloque

### AUD 5.1 Mapeo real ✅
17 módulos mapeados con cache, payload, riesgos y acción.

### AUD 5.2 APIs y Cache-Control
**Hallazgo (cerrado in-pass):**
| Severidad | Endpoint | Problema | Corrección |
|-----------|----------|----------|------------|
| baja | `/api/programaciones/cycle-range/[cycleKey]` | Sin `Cache-Control` explícito, error no canon | ✅ Agregado `Cache-Control: private, max-age=300, stale-while-revalidate=600` (cycle range cambia raramente — depende de event_date SCD2) + `apiJsonError(message, 500, requestId)` para errores |

40 endpoints con Cache-Control declarado, todos `private`. 0 endpoints con cache pública.

### AUD 5.3 Cache server y keys ✅
- `src/lib/server-cache.ts` (`cachedAsync`) con tests (`server-cache.test.ts`)
- Keys incluyen filtros relevantes (verificado spot-check)
- TTL declarado por uso

### AUD 5.4 SWR y fetch cliente ✅
- 0 hits de `refreshInterval` o `revalidateOnFocus: true` en módulos
- SWR keys serializadas con `buildQueryString(filters)` o equivalente
- `keepPreviousData: true` en módulos críticos (Balanzas, Productividad) para evitar flicker
- Fetch cliente centralizado en `@/lib/fetch-json`

### AUD 5.5 Queries SQL pesadas ✅
**`SELECT *` audit (6 hits):**
| Archivo | Contexto | Aceptable? |
|---------|----------|------------|
| `my-account-repository.ts:38`, `personal-workspace-bootstrap.ts:78` | `public.usr_dim_profile_pref_scd0` (1 fila perfil personal) | ✅ todas las columnas son útiles |
| `calidad-punto-apertura.ts:219` | CTE interna `useful` | ✅ no es payload final |
| `my-work-repository.ts:130, 154` | `public.wrk_v_calendar_item_cur` (filtrados por usuario) | ✅ vistas dimensionalmente acotadas |
| `postcosecha-balanzas-core.ts:761` | `SELECT * FROM ${nodeDef.viewName} ... LIMIT 2000` | ✅ LIMIT explícito |

**0 `SELECT *` productivo sin justificación.**

### AUD 5.6 Paginación, limits y payload size ✅
- Balanzas detail: `LIMIT 2000` explícito
- Comparación options: `LIMIT` en queries dimensionales
- Productividad: lazy load por ciclo (no precarga detalle)
- Talento-humano persona: TTL 300s (snapshot estable, payload no crece dinámicamente)

### AUD 5.7 Re-renders y memoización ✅
- 0 `console.log/debug/time` productivos
- `useMemo` sobre `nodeMap`, `processNodes`, `groupRows` en explorers (Productividad, Balanzas)
- Spot-check: handlers críticos estables o memoizados

### AUD 5.8 Charts pesados ✅
- Balanzas migró de bpmn-js a SVG hand-crafted (deps run-time reducidas)
- bpmn-js solo se carga vía `ProcessViewerOverlay` en Fenograma (lazy `dynamic()`)
- Mortality curve panel lazy `dynamic()`
- Recharts usa `ResponsiveContainer` + helpers compartidos (`axisTickStyle`, `RechartsTooltipAdapter`)

### AUD 5.9 Tablas grandes ✅
- `ScrollFadeTable` canon en todos los explorers
- Productividad: `CycleDetailRows` lazy via SWR (no precarga drill-down)
- Balanzas: `BalanzasExpandableTable` con tree expand on demand

### AUD 5.10 Overlays bajo demanda ✅
- `BalanzasNodeDetailDialog`: SWR con `keepPreviousData` + `dedupingInterval: 10000`
- `BlockProfileModal`: 5 paneles internos cargan condicionalmente (beds/valves/curve/mortality/hours)
- `PersonProfileDialog`: tabs cargan lazy según permission (no carga panel médico si user no tiene `panel:person-sheet.medical`)

### AUD 5.11 localStorage y rehidratación ✅
4 hits, todos client-side seguros:
- `use-solver-draft-storage.ts` (con tests + `isResultStale`)
- `dashboard-scale-toggle.tsx` (preferencia UI)
- `theme-provider.tsx` (next-themes pattern)

### AUD 5.12 Bundle y client/server boundaries ✅
- **`"use client"` en `src/app/`: 1 page (login)** — resto son server components
- Lazy `dynamic()` en módulos pesados:
  - Campo: 6 imports lazy (Leaflet, raster controls, sub-modals, cycle-selector)
  - Fenograma: bpmn-js via ProcessViewerOverlay
  - Mortality: curve-panel
- 0 dependencias duplicadas

### AUD 5.13 Archivos monolíticos
| Archivo | Líneas | Estado |
|---------|--------|--------|
| `src/lib/fenograma-core.ts` | 2346 | Sin nuevo crecimiento — deuda AUD 4 |
| `src/lib/postcosecha-balanzas-core.ts` | 933 | Sin nuevo crecimiento — deuda AUD 2 |
| `src/modules/fenograma/components/block-profile-modal.tsx` | 1791 | Sin nuevo crecimiento — deuda AUD 1 |
| `src/lib/postcosecha-clasificacion-en-blanco-*.ts` | (split en 6 archivos) | OK split |

**0 monolitos crecieron en este pase. Plan de split documentado en deudas previas.**

### AUD 5.14 Módulos críticos ✅
- **Fenograma**: pivot calculado server-side en `gld.mv_prod_fenograma_cur`; modal lazy
- **Mortality**: curvas vienen agregadas; `force-dynamic` con TTL 60s
- **Productividad**: KPIs ponderados por ciclo (no en cliente sobre raw); detail lazy
- **Balanzas**: SVG no recalcula layout (constants en `balanzas-svg-layout.ts`); overlays HTML pixel-perfect
- **Clasif Blanco**: `isResultStale` activa cuando inputs cambian; localStorage versionado
- **Campo**: Leaflet eventHandlers memoizados; GeoJSON construido una vez
- **Talento-humano**: fichas persona lazy via `PersonProfileDialog`

### AUD 5.15 Docker, build y runtime ✅
- Build standalone (verificado AUD 1)
- Puerto 7777, env_file, TZ=UTC en docs/despliegue.md
- 0 devDependencies en runtime final

### AUD 5.16 Observabilidad básica ✅
- requestId en errores via `apiJsonError` y `getRequestId`
- 4 console.error en api/ son metadata-only (verificado AUD 3)
- Health endpoints suficientes para Docker

### AUD 5.17 Tests ✅
- 79/79 tests passing
- 0 tests dependen de DB real (verificado AUD 3)
- `format.test.ts`, `server-cache.test.ts`, `fetch-json.test.ts`, `use-solver-draft-storage.test.ts` cubren utilities críticas

---

## 6. Correcciones aplicadas

| Archivo | Cambio | Motivo | Riesgo mitigado | Validación |
|---------|--------|--------|-----------------|------------|
| `src/app/api/programaciones/cycle-range/[cycleKey]/route.ts` | Agregado `Cache-Control: private, max-age=300, stale-while-revalidate=600` + `apiJsonError(msg, 500, requestId)` para errores en lugar de `NextResponse.json({error}, {status:500})` | Endpoint sin Cache-Control explícito (todos los demás 40 endpoints lo tenían); error no canon | Misses de cache innecesarios sobre datos estables (cycle range cambia raramente — depende de event_date SCD2). Errores ahora con requestId trazable | ✅ typecheck verde, 79/79 tests passing |

---

## 7. Queries optimizadas

Ninguna en AUD 5. Las queries existentes ya cumplen el contrato:
- 0 SQL inline en `src/app/api/*`
- `LIMIT` explícito en queries productivas (balanzas detail, opciones, etc.)
- Aggregations server-side; no se trae raw para filtrar en cliente

---

## 8. Cache revisada

| Endpoint | Cache-Control | TTL | Depende de permisos | Estado |
|----------|----------------|-----|---------------------|--------|
| Reads consultivos (40 endpoints) | `private, max-age=15-300, swr=60-600` | variable | Sí (cookie session privada) | ✅ |
| Mutaciones (10 endpoints) | `private, no-store` | 0 | Sí | ✅ |
| Personal workspace (11 endpoints) | `private, no-store` | 0 | Sí | ✅ |
| `/api/programaciones/cycle-range` | **AGREGADO**: `private, max-age=300, swr=600` | 300s | Sí (auth) | ✅ FIX |

**0 cache pública en endpoints protegidos. 0 keys de cache server compartidas entre usuarios.**

---

## 9. Renders optimizados

Ninguna corrección aplicada en AUD 5 (sin evidencia de bottleneck observable). Memoizaciones existentes verificadas:
- `useMemo` sobre `nodeMap`, `processNodes`, `groupRows` (Productividad, Balanzas)
- `useDeferredValue` sobre filtros con I/O alta (Balanzas, Productividad)
- `keepPreviousData` en SWR para evitar flicker

---

## 10. Payloads reducidos o protegidos

Ninguno en AUD 5. Payloads ya están dimensionalmente acotados:
- Balanzas detail: `LIMIT 2000`
- Productividad: lazy detail por ciclo
- Talento-humano persona: TTL 300s sobre snapshot estable

---

## 11. Archivos grandes y plan de split

| Archivo | Líneas | Plan |
|---------|--------|------|
| `src/lib/fenograma-core.ts` | 2346 | Split planeado AUD 5+ por evidencia: extraer `mappers.ts`, `queries.ts`, `types.ts`. Sin evidencia de bug, no split en este pase (regla AUD #7) |
| `src/modules/fenograma/components/block-profile-modal.tsx` | 1791 | Refactor a `DialogShell` + split en 5 archivos (deuda AUD 1 #2) |
| `src/lib/postcosecha-balanzas-core.ts` | 933 | Considerar extraer `BALANZAS_NODES` y `COLUMN_LABELS` (deuda AUD 2) |
| `src/lib/salud.ts` | 808 | Excede 700, sin crecimiento nuevo |

---

## 12. Tests agregados o actualizados

Ninguno nuevo en AUD 5. Cobertura existente cubre utilities críticas:
- `format.test.ts` (16 tests, formatPercent percent vs ratio + edge cases)
- `server-cache.test.ts` (cache key + TTL)
- `fetch-json.test.ts` (error handling)
- `use-solver-draft-storage.test.ts` (localStorage + isResultStale)
- `auth-session.test.ts`, `dead-plants-reseed.test.ts` (desbloqueados AUD 3)

---

## 13. Documentación actualizada

| Documento | Cambio | Motivo |
|-----------|--------|--------|
| `docs/audits/AUD-5-performance-cache-optimization.md` (NUEVO) | Este archivo | Entregable AUD 5 |
| `scripts/check-canon.mjs` | AUD-5 agregado a `officialDocs` whitelist | Doc canon-compliant |

**Sin cambios en `docs/apis.md`/`docs/quality-baseline.md`** — el contrato cycle-range se mantiene (cache adición no rompe nada; era falta documentada).

---

## 14. Validación final

### `npm run check` (typecheck + tests)
✅ **79/79 tests passing**, 0 typecheck errors

### `npm run canon:check`
✅ Canon + Docs verde

### `npm run build`
✅ verde (verificado tras Cache-Control update)

### Búsquedas finales

| Search | Resultado | Estado |
|--------|-----------|--------|
| `SELECT \*` en `src/lib`, `src/app/api` | 6 hits, todos justificados (perfil 1 fila, CTE interna, vista usuario, LIMIT 2000) | ✅ |
| `useSWR\|fetchJson\|fetch\(` | Centralizado vía `@/lib/fetch-json` | ✅ |
| `Cache-Control` | 40 endpoints con header explícito + 1 nuevo (cycle-range) | ✅ |
| `localStorage\|sessionStorage` | 4 archivos client-side seguros | ✅ |
| `"use client"` en `src/app/` | 1 (login) | ✅ |
| `console.log\|console.time\|console.debug` | 0 hits productivos | ✅ |
| `dynamic\(` | 9+ lazy imports (Campo Leaflet, Fenograma bpmn, Mortality) | ✅ |
| `refreshInterval\|revalidateOnFocus: true` | 0 hits | ✅ |

---

## 15. Riesgos residuales

**Ninguno bloqueante para producción interna.**

| Severidad | Módulo | Archivo | Riesgo | Por qué no se corrigió | Acción requerida | Bloquea? |
|-----------|--------|---------|--------|--------------------------|-------------------|---------|
| baja | fenograma-core (2346 líneas) | `src/lib/fenograma-core.ts` | Monolito puede dificultar mantenimiento futuro | Sin evidencia de bug; split sin plan riguroso es regla AUD #7 violada | Plan dedicado: extraer mappers/queries/types | NO |
| baja | block-profile-modal (1791 líneas) | `src/modules/fenograma/components/block-profile-modal.tsx` | UI gigante con 5 modales pre-canon | Refactor mayor — deuda AUD 1 #2 | Refactor a `DialogShell` + split | NO |
| baja | Productividad CycleDetailRows | `src/modules/productividad/components/productividad-explorer.tsx` | `<tr onClick>` ad hoc para expand/collapse | Deuda AUD 1 #1 (refactor a `ExpandableTreeTable`) | Migrar | NO |
| baja | balanzas-core (933 líneas) | `src/lib/postcosecha-balanzas-core.ts` | Excede 700 (límite dominio) | Sin crecimiento nuevo | Considerar extraer `BALANZAS_NODES` | NO |

---

## 16. Criterio de cierre AUD 5

- [x] main confirmado
- [x] cero worktrees
- [x] mapa de performance creado (17 módulos)
- [x] Cache-Control revisado (40 + 1 fix endpoints)
- [x] cache server revisada (`server-cache.ts` con tests)
- [x] SWR keys revisadas (filtros serializados, sin refreshInterval/revalidateOnFocus)
- [x] queries pesadas revisadas (0 SQL inline en api/, LIMITs explícitos)
- [x] SELECT * eliminado o justificado (6 hits, todos justificados)
- [x] payloads grandes revisados
- [x] paginación/limits revisados (LIMIT 2000 balanzas, lazy productividad)
- [x] charts pesados revisados (Recharts canon, bpmn-js solo Fenograma lazy)
- [x] tablas grandes revisadas (ScrollFadeTable canon, lazy expansion)
- [x] overlays bajo demanda revisados (SWR keepPreviousData, lazy tabs)
- [x] localStorage revisado (4 archivos client-only seguros)
- [x] bundle/client boundaries revisados (1 "use client" en app/, lazy dynamic en módulos pesados)
- [x] monolitos vigilados revisados (sin nuevo crecimiento)
- [x] Docker/runtime revisado (sin cambios; ya conforme docs/despliegue.md)
- [x] observabilidad básica revisada (requestId, logger, 0 console.log productivos)
- [x] tests sin DB real (79/79 passing)
- [x] npm run test verde
- [x] npm run check verde
- [x] npm run canon:check verde
- [x] npm run build verde

**AUD 5 cerrado. Sistema cumple contrato performance/cache para producción interna.**
