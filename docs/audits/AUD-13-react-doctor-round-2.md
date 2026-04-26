# AUD 13 — React Doctor + Knip Cleanup Round 2

## 1. Contexto

| Campo | Valor |
|-------|-------|
| Fecha | 2026-04-26 |
| Ruta local | `C:\Users\erick.rivera\Desktop\CoreX\corex_v4` |
| Rama | `main` |
| Worktrees | 1 (principal) |
| Commit inicial | `cbc5bc8` (cierre AUD 12) |
| Commit final | (anota tras commit AUD 13) |
| Origen | Re-corrida `react-doctor` post-AUD-12 en `C:\Users\erick.rivera\AppData\Local\Temp\react-doctor-2074135c-7b39-4adf-bf9a-a8013fc5e4ff` |

**Naturaleza:** Round 2 de limpieza no invasiva. Cierra hallazgos accionables que quedaron tras AUD 12 + documenta falsos positivos del linter.

---

## 2. Comparación AUD 12 → AUD 13

### ✅ Cerrados desde AUD 12 (ya no aparecen)

| Hallazgo previo | Acción AUD 12 | Confirmado cerrado |
|-----------------|---------------|---------------------|
| ERROR `no-derived-state-effect` | search-input pattern store-prev | ✅ |
| `jsx-a11y/no-autofocus` (2) | autoFocus removido | ✅ |
| `knip/duplicates` BAR_COLORS\|TALENTO_COLORS | alias eliminado | ✅ |
| `no-gradient-text` (login) | solid color | ✅ |
| `no-usememo-simple-expression` | useMemo trivial removido | ✅ |
| `rerender-memo-with-default-value` | EMPTY_RECORDS module-level | ✅ |
| `js-flatmap-filter` | flatMap aplicado | ✅ |
| `knip/files` 39 | -7 (5 scripts + 2 my-account) | ✅ ahora 32 |

### 🟢 Cerrados en AUD 13

| Hallazgo | Cantidad | Acción |
|----------|----------|--------|
| `no-tiny-text` inline `fontSize: "9px"` (programaciones) | 3 | `9px → 11px` |
| `no-array-index-as-key` con ID disponible | 2 | keys con IDs reales |
| `knip/files` shims vacíos | 2 | `talento-humano/queries.ts`, `users/queries.ts` eliminados |

### 📋 Documentados como FALSO POSITIVO

| Hallazgo | Por qué es falso positivo |
|----------|---------------------------|
| `scripts/validate-runtime-env.mjs` huérfano | **Referenciado en `Dockerfile:56,68` (CMD)** — knip no detecta refs en archivos no-TS |
| `search-input.tsx:36-37` dual `no-derived-useState` | **Pattern oficial React 19 store-prev-during-render** — react-doctor no distingue del anti-pattern simple |

---

## 3. Cambios aplicados

### 3.1 Tiny-text inline → 11px

**Archivo:** `src/modules/programaciones/components/programaciones-explorer.tsx`

3 ocurrencias `fontSize: "9px"` inline (líneas 163, 169, 183) → `fontSize: "11px"`. Mejora WCAG legibilidad del Gantt-like denso. El cambio AUD 12 fue `text-[9px]` className; este round es `style={{fontSize}}` inline (categorías distintas).

### 3.2 Array index as key — keys con ID estable

**`programaciones-explorer.tsx:750`:**
```tsx
// ANTES
{selectedEvents.map((ev, i) => (
  <div key={i}>...
))}

// DESPUÉS — key compuesta con campos del ProgramacionRecord
{selectedEvents.map((ev) => (
  <div key={`${ev.cycleKey}-${ev.blockId}-${ev.activityCode}-${ev.ilumLabel ?? "x"}`}>...
))}
```

**`person-list-modal.tsx:65`:**
```tsx
// ANTES
key={`${person.personId}-${person.areaId}-${index}`}

// DESPUÉS — sin index (personId + areaId únicos por snapshot)
key={`${person.personId}-${person.areaId}`}
```

### 3.3 Eliminación de re-export shims

**Archivos eliminados:**
- `src/modules/talento-humano/queries.ts` — solo `export * from "@/lib/talento-humano"` (1 línea, 0 consumidores)
- `src/modules/users/queries.ts` — solo `export * from "@/lib/users"` (1 línea, 0 consumidores)

**Decisión:** Eliminar > Mover. AUD 2 los tracked como deuda menor sugiriendo mover a `<modulo>/server/queries.ts`, pero al verificar:
- 0 imports en todo `src/`
- Contenido real vive en `src/lib/<modulo>` y sigue exportándose
- Mover un re-export que nadie usa no aporta valor

Cualquier futuro consumidor puede importar directamente desde `@/lib/<modulo>` siguiendo el contrato canon.

---

## 4. Tier 3 — Deuda restante NO bloqueante (sin cambios)

Sin cambios respecto a AUD 12 §4. Todos los hallazgos siguen documentados:

| Hallazgo | Count | Estado |
|----------|-------|--------|
| `no-giant-component` | 5 | Deuda AUD 1/2/9 |
| `no-z-index-9999` (Leaflet) | 6 | Excepción canon AUD 2 |
| `click-events-have-key-events` (backdrops) | 5 | Intencional click-to-close |
| `no-static-element-interactions` | 4 | Mismo motivo |
| `prefer-useReducer` | 7 | Refactor opcional |
| `prefer-dynamic-import` (recharts) | 6 | Charts ya lazy donde crítico |
| `no-cascading-set-state` (multi-select) | 1 | Refactor de filter, riesgo |
| `no-effect-event-handler` | 5 | Review case-by-case |
| `no-derived-useState` (theme + 2 forms) | 3 | Pattern controlled-uncontrolled válido |
| `no-inline-exhaustive-style` (programaciones) | 2 | Refactor menor |
| 9 array index as key restantes | 9 | Listas estáticas (sidebar, breadcrumb, action-menu, balanzas constantes) |
| `knip/files` 30 restantes | 30 | API canon (`reuse-index.md`) o `validate-runtime-env.mjs` Dockerfile |

---

## 5. Archivos modificados

```
edit    src/modules/programaciones/components/programaciones-explorer.tsx       (3 fontSize 9px→11px + array index key con ID)
edit    src/modules/talento-humano/components/person-list-modal.tsx              (key sin index)
delete  src/modules/talento-humano/queries.ts                                    (shim 1 línea, 0 imports)
delete  src/modules/users/queries.ts                                             (shim 1 línea, 0 imports)
new     docs/audits/AUD-13-react-doctor-round-2.md                               (este archivo)
edit    scripts/check-canon.mjs                                                  (AUD-13 a officialDocs)
edit    docs/audits/README.md                                                    (fila AUD 13)
```

---

## 6. Validación final

| Check | Resultado |
|-------|-----------|
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ⚠️ 9 warnings preexistentes (sin nuevos) |
| `npm run test` | ✅ 16 archivos / 79 tests passing |
| `npm run canon:check` | ✅ Canon + Docs verde |
| `npm run legacy:check` | ✅ passed (6 warnings preexistentes) |
| `npm run build` | ✅ verde |

---

## 7. Riesgos residuales

**0 introducidos por AUD 13.** Cambios mecánicos sin alteración de comportamiento.

Riesgos heredados consolidados en [`AUD-10-pre-release-go-live.md`](./AUD-10-pre-release-go-live.md) §11 siguen vigentes.

---

## 8. Cierre AUD 13

- [x] main confirmado
- [x] cero worktrees
- [x] 3 fontSize 9px→11px aplicados
- [x] 2 array index keys con ID estable
- [x] 2 shims `queries.ts` eliminados
- [x] 2 falsos positivos documentados
- [x] npm run typecheck verde
- [x] npm run test verde (79/79)
- [x] npm run canon:check verde
- [x] npm run build verde
- [x] doc AUD-13 actualizado

**AUD 13 cerrado. Mantiene CIERRE OK PARA PRODUCCIÓN de AUD 11.**
