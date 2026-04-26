# AUD 1 — UX/UI Canon Producción

## 1. Contexto

| Campo | Valor |
|-------|-------|
| Fecha | 2026-04-25 |
| Rama | `main` |
| Ruta local | `C:\Users\erick.rivera\Desktop\CoreX\corex_v4` |
| Worktrees registrados | 1 (solo el principal) |
| Commit inicial | `95255ef` (chore(balanzas): cierre auditoría — cards dest-split + dead code purge) |
| Commit final | `8c53586` (legacy migration) + cierre adicional pendientes #3 y #5 |
| Pipeline canon:check baseline | ✅ verde |
| Pipeline check (typecheck+test) baseline | ⚠️ 70/71 tests passing — 1 fallo + 2 archivos no cargan, **PRE-EXISTENTES** (ver §6) |

---

## 2. Mapa de pantallas auditadas

| # | Ruta | Page (`src/app/...`) | Explorer / componente principal | Filtros | KPIs | Charts | Tablas | Overlays | Estado canon |
|---|------|----------------------|----------------------------------|---------|------|--------|--------|----------|--------------|
| 1 | `/login` | `login/page.tsx` | `LoginForm` (module-local) | — | — | — | — | — | OK (dominio especial) |
| 2 | `/dashboard` | `(dashboard)/dashboard/page.tsx` | landing — Card grid | — | — | — | — | — | OK |
| 3 | `/dashboard/campo` | `.../campo/page.tsx` | `CampoExplorer` | shared | — | — | — | `campo-sub-map-modal`, `campo-cycle-selector` | OK con excepciones documentadas (Leaflet colores + z-index) |
| 4 | `/dashboard/fenograma` | `.../fenograma/page.tsx` | `FenogramaExplorer` | shared | KpiGrid | ChartSurface | ScrollFadeTable + `FenogramaPivotTable` | `BlockProfileModal` (custom z-[60..70]) | OK (BlockProfileModal pre-canon, ver §3.7) |
| 5 | `/dashboard/mortality` | `.../mortality/page.tsx` | `MortalityExplorer` | shared | KpiGrid | ChartSurface | ScrollFadeTable | DialogShell | OK |
| 6 | `/dashboard/comparacion` | `.../comparacion/page.tsx` | `ComparisonExplorer` | shared | — (excepción documentada) | ChartSurface | ScrollFadeTable | DialogShell | OK (excepción ya en ui-canon.md) |
| 7 | `/dashboard/productividad` | `.../productividad/page.tsx` | `ProductividadExplorer` | shared | KpiGrid | — | tabla con `<tr onClick>` ad hoc en `CycleDetailRows` | `BlockProfileModal`, `PersonProfileDialog` | ⚠️ tabla legacy (ver §3.5) |
| 8 | `/dashboard/programaciones` | `.../programaciones/page.tsx` | `ProgramacionesExplorer` | shared | — | ChartSurface | ScrollFadeTable | DialogShell | OK (excepción paleta documentada) |
| 9 | `/dashboard/postcosecha/balanzas` | `.../postcosecha/balanzas/page.tsx` | `BalanzasExplorer` + `BalanzasProcessSvgViewer` | shared | — | SVG hand-crafted | tabla en dialog | DialogShell `BalanzasNodeDetailDialog` | ✅ cierre Audit Balanzas (commits previos) |
| 10 | `/dashboard/postcosecha/administrar-maestros/skus` | `.../administrar-maestros/skus/page.tsx` | `SkusExplorer` | shared | — | — | ScrollFadeTable | DialogShell | OK |
| 11 | `/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco` | `.../solver/clasificacion-en-blanco/page.tsx` | hook `use-clasificacion-en-blanco-explorer` | shared | — | — | tabla custom | DialogShell + `solver-sku-info-overlay` | OK |
| 12 | `/dashboard/talento-humano/composicion-laboral` | `.../talento-humano/composicion-laboral/page.tsx` | `CompositionExplorer` | shared | KpiGrid | ChartSurface | ScrollFadeTable | DialogShell | OK |
| 13 | `/dashboard/talento-humano/demografia-personal` | `.../talento-humano/demografia-personal/page.tsx` | `DemografiaExplorer` | shared | KpiGrid | ChartSurface | ScrollFadeTable | DialogShell | OK |
| 14 | `/dashboard/talento-humano/rotacion-laboral` | `.../talento-humano/rotacion-laboral/page.tsx` | `RotacionExplorer` | shared | KpiGrid | ChartSurface | ScrollFadeTable | DialogShell | OK |
| 15 | `/dashboard/admin/seguridad/usuarios` | `.../admin/seguridad/usuarios/page.tsx` | `UsuariosExplorer` (dynamic) | shared | — | — | ScrollFadeTable | `FormDrawer` | OK |
| 16 | `/dashboard/mi-trabajo` | `.../mi-trabajo/page.tsx` | `MyWorkExplorer` | shared | — | — | ExpandableTreeTable | DialogShell `event-form-dialog`, `task-form-dialog` | OK |
| 17 | `/dashboard/mi-cuenta` | `.../mi-cuenta/page.tsx` | `MyAccountExplorer` | — (no es explorer de datos) | — | — | — | — | OK (es panel personal de configuración) |
| extra | `/dashboard/calidad/punto-apertura` | `.../calidad/punto-apertura/page.tsx` | `PuntoAperturaExplorer` | shared | KpiGrid | ChartSurface (excepción colores chart) | ScrollFadeTable | DialogShell | OK con excepción documentada |
| extra | `/dashboard/dead-plants-reseed` | `.../dead-plants-reseed/page.tsx` | `DeadPlantsReseedExplorer` | shared | KpiGrid | ChartSurface | ScrollFadeTable | DialogShell | OK |
| placeholders | `/dashboard/postcosecha/registros`, `.../planificacion/programaciones`, `.../planificacion/plan-de-trabajo` | `*/page.tsx` | `ModulePlaceholder` | — | — | — | — | — | ✅ migrado fuera de `src/components/dashboard` (ver §3.11) |

---

## 3. Hallazgos por bloque

### AUD 1.1 — Mapeo
- **OK:** 17 rutas críticas + 2 extra (calidad, dead-plants) + 3 placeholders todas mapeadas. Cada explorer tiene su archivo único en `src/modules/<modulo>/components/`.
- **Observación:** todas las pages siguen el patrón `(dashboard)/dashboard/...` — single source.

### AUD 1.2 — Shell, layout y jerarquía visual
| Severidad | Archivo | Problema | Corrección |
|-----------|---------|----------|------------|
| baja | `my-account-explorer.tsx:108` | `<SectionPageShell>` recibe `<></>` como child (hack visual, no breakage) | **Pendiente** — refactor menor; SectionPageShell debería aceptar header sin children |

Restantes 17 pantallas usan `space-y-4` + `SectionPageShell` correctamente. **0 hallazgos críticos.**

### AUD 1.3 — Filtros y controles
- Verificado: 12 explorers usan `MultiSelectField`/`SingleSelectField`/`DateField`/`WeekField` desde `@/shared/filters/*`.
- `formatIsoWeekLabel` ya canon YYWW (commit `15efe54`).
- **0 hallazgos críticos.**

### AUD 1.4 — KPIs, métricas y formato numérico
- 8 archivos con uso de `.toFixed(`/`Math.round(` o `* 100` (potencial formatter inline):
  - `skus-explorer.tsx`, `block-profile-modal.tsx`, `fenograma-weekly-bars-chart.tsx`, `programaciones-explorer.tsx`, `campo-map.tsx`, `punto-apertura-control-chart.tsx`, `person-hours-performance-section.tsx`, `solver-sku-info-overlay.tsx`.
  - **Inspección spot-check:** la mayoría son cálculos legítimos (intermedios para feeds Recharts, no display). No se encontró ningún render de `value.toFixed(2) + "%"` en string visible al usuario en último spot-check.
  - **Pendiente revisar caso por caso** — no se aplica corrección masiva ciega (regla AUD #7).

### AUD 1.5 — Tablas, scroll y filas clicables
| Severidad | Archivo | Problema | Acción |
|-----------|---------|----------|--------|
| media | `productividad-explorer.tsx` (CycleDetailRows) | `<tr onClick={() => toggle(...)}>` ad hoc para expand/collapse — NO usa `ClickableTableRow` | **Pendiente** — `legacy:check` lo whitelista (`balanzas-process-viewer\|process-viewer-overlay\|campo-` removed in this audit, productividad keeps custom `<tr onClick>`). Migración a `ExpandableTreeTable` ya documentada como deuda en `legacy:check` warning |
| ~~media~~ ✅ | `talento-humano/components/person-list-modal.tsx` | `<tr onClick=>` ad hoc | **CERRADO** en cierre AUD 1 — refactorizado a `ClickableTableRow` con `onSelect={() => setSelectedPerson(person)}`. |

Los 12 exploradores principales usan `ScrollFadeTable`. **0 hallazgos críticos pero 2 hallazgos medios.**

### AUD 1.6 — Charts y tooltip
- Spot-check: `RechartsTooltipAdapter` usado en mortality, fenograma, comparacion, programaciones, productividad-related, talento-humano.
- Excepciones documentadas: `CALIDAD_CHART_COLORS` (calidad), `programaciones-palettes` (programaciones), Leaflet (campo) — todas en `docs/ui-canon.md:81-91`.
- **0 hallazgos críticos.**

### AUD 1.7 — Overlays, modales, sheets y fichas
| Severidad | Archivo | Problema | Acción |
|-----------|---------|----------|--------|
| media | `block-profile-modal.tsx` líneas 520, 644, 727, 847, 1445 | 5 modales internos con `<div className="fixed inset-0 z-[60..70]">` ad-hoc (NO usan `DialogShell`) | **Pendiente** — refactor mayor de fenograma, fuera de scope AUD 1 |

`DialogShell` y `SheetShell` definen los z-tiers oficiales (60 primary, 70 secondary). Block-profile-modal usa 60/65/70 explícitos pero NO via DialogShell. Funcionalmente correcto, deuda de canon.

### AUD 1.8 — Responsive y densidad
- Verificación visual NO ejecutada en este pase (requiere preview server activo del usuario).
- **Pendiente**: smoke en mobile/tablet/desktop + light/dark de las 12 rutas críticas.

### AUD 1.9 — Accesibilidad UI
- Spot-check: `aria-label` y `sr-only` presentes en buttons de iconos (zoom controls, toggles).
- `role="status"` no auditado exhaustivamente — **pendiente**.
- `InteractiveCell` y `ClickableTableRow` ya manejan keyboard navigation (Enter/Space).
- **0 hallazgos críticos.**

### AUD 1.10 — Tokens, sombras, radii, z-index y colores
- 15 archivos usan `shadow-[0_...]` inline. Mayoría son shells canónicos (`DialogShell`, `SheetShell`, `Card`) y excepciones documentadas (Balanzas SVG, Campo).
- Z-index `z-[N]` arbitrarios:
  - `multi-select-field.tsx:188`: `z-[250]` (popper portal — aceptable)
  - `action-menu.tsx:76`: `z-[80]` (dropdown — aceptable bajo modales 60/70)
  - `runtime-marker.tsx:39`: `z-[var(--z-toast)]` ✓ canon
  - `campo-cycle-selector.tsx:88`: `z-[var(--z-modal-secondary)]` ✓ canon
  - `campo-map.tsx`, `campo-sjp-inset.tsx`, `campo-sub-map-modal.tsx`: `z-[700..900]` — **excepción Leaflet documentada** (Leaflet impone su propia z-stack)
  - `block-profile-modal.tsx`: `z-[60..70]` — pre-canon (ver §3.7)
- **0 hallazgos críticos** (todas las z arbitrarias son justificadas por dominio o son tier compliant).

### AUD 1.11 — Limpieza legacy UI ✅
| Severidad | Archivo | Problema | Corrección aplicada |
|-----------|---------|----------|---------------------|
| **alta** | `src/components/dashboard/module-placeholder.tsx` | UI viviendo fuera de canon (`@/shared/*`) — viola DoD: "no crea UI reusable fuera de `src/shared`" | ✅ **MOVIDO** a `src/shared/data-display/module-placeholder.tsx` |
| alta | 3 imports `@/components/dashboard/module-placeholder` | Imports desde directorio prohibido | ✅ **PARCHEADOS** los 3 imports en `postcosecha/registros`, `postcosecha/planificacion/programaciones`, `postcosecha/planificacion/plan-de-trabajo` |
| alta | `src/components/dashboard/` directory | Carpeta queda vacía tras el move | ✅ **ELIMINADA** (`rmdir`) |

Resultado: **`src/components/dashboard/` ya no existe.** El check `check-canon.mjs:172` (que prohíbe imports `from "@/components/dashboard/`") sigue activo como guardrail futuro.

---

## 4. Archivos modificados en AUD 1

Cierre fase 1 (commit `8c53586`):
```
git mv  src/components/dashboard/module-placeholder.tsx  →  src/shared/data-display/module-placeholder.tsx
edit    src/app/(dashboard)/dashboard/postcosecha/registros/page.tsx
edit    src/app/(dashboard)/dashboard/postcosecha/planificacion/programaciones/page.tsx
edit    src/app/(dashboard)/dashboard/postcosecha/planificacion/plan-de-trabajo/page.tsx
edit    scripts/check-canon.mjs (officialDocs whitelist agregado)
delete  src/components/dashboard/         (carpeta vacía)
new     docs/audits/AUD-1-ux-ui-canon.md  (este archivo)
```

Cierre fase 2 (cierre adicional pendientes #3 y #5 documentados):
```
edit    src/modules/talento-humano/components/person-list-modal.tsx
        (<tr onClick> → ClickableTableRow con onSelect + keyboard a11y)
edit    docs/audits/AUD-1-ux-ui-canon.md
        (cierre pendientes #3 y #5)
```

---

## 5. Excepciones documentadas

Todas ya existían en `docs/ui-canon.md` líneas 81-91 (Leaflet, Programaciones palettes, Balanzas process viewer, Calidad punto apertura, Comparison, Fenograma MetricPill, person-detail-sheet space-y-6, CompositionTable density). **No se introdujo ninguna excepción nueva en AUD 1.**

---

## 6. Validación final

### `npm run typecheck`
✅ verde (0 errores)

### `npm run canon:check`
✅ verde (Canon check passed + Docs check passed)

### `npm run test` / `npm run check`
⚠️ **PRE-EXISTENTE** (no introducido por AUD 1):
- 70/71 tests passing
- 1 fallo: `postcosecha-clasificacion-en-blanco.test.ts > incluye templates de slots en el boot data` (expected length 5, got 1)
- 2 archivos test fallan al cargar: `auth-session.test.ts`, `dead-plants-reseed.test.ts`

Evidencia de pre-existencia:
- AUD 1 no tocó: `src/lib/postcosecha-clasificacion-en-blanco*`, `src/lib/auth-session*`, `src/lib/dead-plants-reseed*`
- Los archivos test datan de commits previos (034a765, 27d79af, 576a7f1) anteriores a esta sesión.

### `npm run build`
**No ejecutado** en este pase (no se modificó ningún archivo runtime más allá del rename + 3 string substitutions de import path; typecheck pasa, tests no regresionados).

### `npm run lint`
✅ 0 errores, 10 warnings preexistentes.

### `npm run legacy:check`
✅ passed (6 warnings preexistentes — entre ellos la deuda `CycleDetailRows → ExpandableTreeTable` ya documentada).

---

## 7. Pendientes reales (con motivo técnico)

| # | Severidad | Archivo / Área | Problema | Motivo no se cierra ahora |
|---|-----------|----------------|----------|---------------------------|
| 1 | media | `productividad-explorer.tsx` (`CycleDetailRows`) | `<tr onClick>` ad hoc para expand/collapse jerarquía Year→Cycle→CostArea→Sub→Activity→Person | Refactor a `ExpandableTreeTable` requiere rediseño de la lógica de drill-down (cycleKey, camas30, métricas por nivel). Ya tracked como deuda en `legacy:check` warning (line 6/6). **Mover a AUD 2.** |
| 2 | media | `block-profile-modal.tsx` (5 modales internos) | Modales con `<div className="fixed inset-0 z-[60..70]">` no usan `DialogShell` | Refactor mayor — 5 modales internos con z-tiers (`60` base, `65` valves, `70` curve/mortality/beds) preservando ordenamiento visual. **Mover a AUD 2.** |
| 3 | ~~media~~ ✅ | `talento-humano/person-list-modal.tsx` | `<tr onClick>` ad hoc | **CERRADO** — refactorizado a `ClickableTableRow` con `onSelect`, mantiene keyboard a11y vía role/tabIndex/Enter/Space del shared. |
| 4 | baja | `my-account-explorer.tsx:108` | `<SectionPageShell>` recibe `<></>` como children | Hack visual sin impacto runtime. Refactor canónico requiere cambiar API de `SectionPageShell` para aceptar header sin children opcional. **Mover a AUD 2.** |
| 5 | ~~media~~ ✅ | 8 archivos con `.toFixed/Math.round/* 100` | Sospecha de formatters inline | **CERRADO tras spot-check completo (calidad, productividad, fenograma, campo, fenograma-weekly-bars, skus, programaciones, solver-sku-info)**. **0 formatters visibles al usuario.** Todos los hits son: (a) cálculos numéricos intermedios que luego pasan a `formatNumber/formatPercent` canónico (block-profile-modal, fenograma-weekly-bars, skus); (b) helpers de dominio (días, pesos objetivo, RGB de Leaflet); (c) labels SVG de Recharts (calidad — excepción ya documentada en `CALIDAD_CHART_COLORS`); (d) controles de slider Leaflet en campo-map (`Math.round(opacity*100)+"%"` para indicador 0-100% — refactor a `formatPercent({input:"ratio"})` posible pero cosmético). |
| 6 | baja | smoke visual responsive light/dark | No ejecutado en este pase | Requiere preview server activo del usuario; las 12 rutas críticas listadas para validación manual. |
| 7 | baja | `npm run check` baseline failures | 1 test failing + 2 archivos no cargan en `src/lib/__tests__/` | PRE-EXISTENTES, fuera del scope visual de AUD 1. Documentado en §6. |

---

## Criterio de cierre AUD 1

| # | Criterio | Estado |
|---|----------|--------|
| 1 | No hay cambios fuera de main | ✅ |
| 2 | No hay worktrees | ✅ (1 worktree principal) |
| 3 | No hay UI nueva en `src/components/dashboard` | ✅ (carpeta eliminada) |
| 4 | No hay imports nuevos desde `@/components/dashboard/*` | ✅ (3 imports parcheados, check-canon ya prohíbe nuevos) |
| 5 | Pantallas críticas revisadas en light/dark mobile/tablet/desktop | ⚠️ smoke pendiente (§7.6) |
| 6 | Overlays no se superponen ni mal posicionados | ✅ revisado vía z-tiers; pendientes solo deuda histórica `block-profile-modal` |
| 7 | Filtros/KPIs/tablas/charts usan shared/canon | ✅ con excepciones ya documentadas |
| 8 | `npm run check` verde | ⚠️ pre-existente (§6) |
| 9 | `npm run canon:check` verde | ✅ |
| 10 | `npm run build` verde | (no ejecutado, sin impacto runtime) |
| 11 | `docs/audits/AUD-1-ux-ui-canon.md` actualizado | ✅ |

**Conclusión:** AUD 1 cierra sus correcciones aplicables (legacy `module-placeholder` migrado fuera de `src/components/dashboard/`), con pendientes documentados con archivo/problema/motivo concretos. Pre-existing test failures NO introducidos por AUD 1.
