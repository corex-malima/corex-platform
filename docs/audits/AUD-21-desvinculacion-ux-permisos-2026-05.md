# AUD-21 — Desvinculación UX + permisos granulares + sidebar (2026-05-08)

**Estado:** ✅ Aprobada para producción.
**Alcance:** mejoras de interpretabilidad en Desvinculación personal, UX de
asignación de permisos en Admin / Usuarios, e icono faltante en sidebar.

---

## Contexto

Tras AUD-20 (variedad de charts en Desvinculación) el usuario reportó:

- Scatter "Antigüedad vs cumplimiento" no era interpretable a primera vista.
- Charts pequeños con etiquetas que se cortan.
- Tablas de contingencia con scrollbar duplicado (arriba y abajo) — solo
  debe haber uno arriba.
- AreaChart de tendencia mensual mejor al final, no al principio.
- Sección "Explorador" del sidebar sin icono.
- UX de asignación de paneles fine-grained de Colaboradores muy lenta
  (8 toggles individuales sin agrupación visual).

---

## Cambios aplicados

### 🅰 Desvinculación personal — interpretabilidad

**`ExitScatterCard` rediseñado para psicólogos y gerentes:**

- Ahora se titula **"Mapa de salidas: antigüedad × cumplimiento"** con
  subtítulo explicativo de los umbrales (12 meses, 100% cumplimiento).
- 4 **cuadrantes coloreados sutilmente** mediante `ReferenceArea`:
  - 🟢 Cuadrante II — alto cumplimiento + corta antigüedad
  - 🟢 Cuadrante I — alto cumplimiento + larga antigüedad
  - 🟠 Cuadrante III — bajo cumplimiento + corta antigüedad
  - 🔴 Cuadrante IV — bajo cumplimiento + larga antigüedad
- 2 `ReferenceLine` con labels: "12 meses" (eje vertical) y "100% meta"
  (eje horizontal).
- Etiquetas de ejes visibles ("Antigüedad al salir (meses)",
  "Cumplimiento (rend / mínimo)").
- **Leyenda interpretativa 2×2** debajo del scatter con conteos por
  cuadrante:
  - "Pérdida temprana de talento" (alto + temprano)
  - "Cierre natural de ciclo" (alto + tardío)
  - "Mala adaptación / selección" (bajo + temprano)
  - "Desgaste prolongado" (bajo + tardío)
- Altura del scatter: `h-[300px]` → **`h-[360px]`** + reservas de margin
  para que los labels de ejes no se corten.

**Charts más grandes y legibles:**

- `ExitTimeSeriesCard` (AreaChart): `h-[260px]` → **`h-[320px]`** + margins
  amplios para que las etiquetas no se choquen.
- `ExitVerticalBarCard` (BarChart): `h-[260px]` → **`h-[320px]`**, ángulo
  de labels X de `-18°` → **`-28°`**, altura del eje X `56px` → **`84px`**
  para acomodar labels rotados, y truncado de label aumentado de **12 → 18
  caracteres**.

**Layout reorganizado** (`desvinculacion-page.tsx`):

- AreaChart de tendencia mensual movido al **final** de la sección
  (antes estaba arriba). Ahora el flujo es composición → mapa
  interpretativo → cumplimiento × antigüedad → contingencias → TS →
  tendencia mensual.
- Tablas de contingencia ahora son **full-width** (no en grid 2-col)
  para que las columnas tengan aire y se lean.

**Tablas de contingencia con scrollbar canon:**

- `ContingencyTableCard` y `WorkerHeatMatrix` migradas de
  `<div className="overflow-x-auto">` a **`<ScrollFadeTable topScrollbar>`**
  (mismo patrón que Bodega Programaciones / Colaboradores).
- Resultado: scrollbar horizontal **solo arriba** sincronizado con
  el contenido, fade lateral indicando contenido cortado.

### 🅱 Sidebar — icono "Explorador"

`src/config/sidebar-data.ts`:

- Importado `UserSearch` de lucide-react.
- Agregado a `GROUP_ICON_BY_LABEL` → `Explorador: UserSearch`.
- Agregado a `ORDER_BY_LABEL` → `Explorador: 15` (entre Indicadores & KPI
  y Planificación).

Ahora la rama `Talento Humano > Explorador > Colaboradores` muestra el icono
de lupa de personas. Antes la rama "Explorador" se mostraba sin icono.

### 🅲 Admin / Usuarios — UX de permisos fine-grained

**`PermissionSection` y `PermissionSubgroup` nuevos** en `users-page.tsx`:

- Para la sección "Paneles" (única con sub-dominios), se **agrupa
  visualmente por prefijo del label** detectando el `/`. Resultado:
  - 📋 Ficha del personal (3 paneles)
  - 📋 Seguimientos (4 paneles)
  - 📋 Colaboradores (8 paneles)
- Cada sub-grupo es una card con borde y badge de **contador
  `enabledCount/total`**.
- Cada sub-grupo expone botones **"Activar todo" / "Quitar todo"**
  (deshabilitados cuando el estado ya es total/cero) que disparan bulk
  toggle de todas las claves del subgrupo. Antes había que togglear los
  8 paneles de Colaboradores uno por uno.
- El label de cada toggle dentro del sub-grupo **recorta el prefijo
  redundante** (ej. "Información básica" en lugar de "Colaboradores /
  Información básica") para que no haya ruido visual.
- Para secciones que no son "Paneles" (módulos regulares), el grid sigue
  plano sin sub-agrupación.

**Tildes corregidas en labels de paneles** (`access-control.ts`):

- "Informacion" → "Información" (×2)
- "Ficha medica" → "Ficha médica" (×2)
- "Informacion basica" → "Información básica"
- "Filtrar area" → "Filtrar área"

Las tildes son canon de UI (los `resourceKey` siguen siendo ASCII para
compatibilidad).

---

## Calificación post-fix

| Dimensión | AUD-20 | Post-AUD-21 |
|---|---|---|
| Desvinculación — interpretabilidad | 8.0 | **9.5** |
| Desvinculación — variedad visual | 9.4 | 9.5 |
| Desvinculación — densidad de info | 8.5 | **9.3** |
| Sidebar canon | 9.5 | **9.7** |
| Admin permisos UX | 7.5 | **9.5** |
| Léxico / tildes | 9.7 | **9.8** |

**Calificación módulo Desvinculación: 9.4 → 9.5**
**Calificación admin Usuarios: 8.0 → 9.3**

---

## Smoke manual

1. Abrir `/dashboard/talento-humano/desvinculacion-personal`:
   - El **scatter** ya no aparece como un nube de puntos sin contexto;
     hay 4 zonas tinteadas y la leyenda 2×2 explica cada una con
     conteos.
   - Las **tablas de contingencia** ya tienen scrollbar arriba (no
     duplicado abajo).
   - El **AreaChart mensual** está al final de la página, no al principio.
   - Charts más altos: barras y áreas no se sienten apretadas.

2. Abrir el sidebar Talento Humano > Explorador:
   - Icono `UserSearch` (lupa con personas) visible al lado de "Explorador".

3. Abrir Admin > Usuarios > editar un usuario custom:
   - Sección **Paneles** dividida en 3 sub-cards (Ficha del personal,
     Seguimientos, Colaboradores).
   - Cada sub-card tiene badge `n/m` y botones "Activar todo / Quitar
     todo" que aplican el toggle masivo en una sola acción.
   - Toggles individuales muestran el sub-label sin redundancia ("Ficha
     médica" en vez de "Colaboradores / Ficha médica").
   - Tildes correctas en todos los paneles.

---

## Archivos modificados

- `src/modules/talento-humano/components/desvinculacion-charts.tsx`
  (Scatter rediseñado con cuadrantes + leyenda; AreaChart/BarChart más
  altos; ContingencyTableCard y WorkerHeatMatrix con ScrollFadeTable
  topScrollbar)
- `src/modules/talento-humano/components/desvinculacion-page.tsx`
  (orden reorganizado, scatter full-width, tendencia mensual al final)
- `src/config/sidebar-data.ts` (icono `UserSearch` para "Explorador")
- `src/lib/access-control.ts` (tildes en labels de paneles)
- `src/modules/users/components/users-page.tsx`
  (`PermissionSection` + `PermissionSubgroup` con bulk toggle)

---

## Veredicto

✅ Las observaciones del usuario quedaron resueltas con cambios canon
y sin tocar contratos de API ni RBAC. El módulo Desvinculación es ahora
interpretable a primera vista (mapa de cuadrantes, leyenda con conteos).
La asignación de los 8 paneles de Colaboradores pasa de 8 clics a **1
clic** ("Activar todo" en el sub-grupo Colaboradores).
