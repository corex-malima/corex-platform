# Balanzas — Process Engine (BPMN Viewer)

Documentación del subsistema de visualización BPMN interactivo dentro del módulo `postcosecha/balanzas`.

---

## ¿Qué es?

El **process engine** es la capa que renderiza el diagrama BPMN (`postcosecha-es.bpmn`) como un canvas interactivo. Cada tarea del diagrama puede asociarse a un nodo de datos (BalanzasNodeData), mostrando KPIs, ratios y totales directamente sobre el flujo de postcosecha.

Rutas principales:
- BPMN asset: `public/processes/postcosecha-es.bpmn`
- Entry component: `src/modules/postcosecha/components/balanzas-process-dashboard.tsx`

---

## Arquitectura de componentes

```
balanzas-explorer.tsx          ← orquestador principal (filters, SWR, selection)
└── balanzas-process-dashboard.tsx   ← layout engine + estado local del canvas
    ├── balanzas-process-topbar.tsx  ← barra superior: search, zoom, export
    ├── balanzas-process-stage-nav.tsx ← sidebar: navegación por lane
    ├── balanzas-process-engine.tsx  ← BPMN canvas (bpmn-js NavigatedViewer)
    └── balanzas-process-node-panel.tsx ← panel lateral: Resumen / Desglose / Metadatos
```

**Estado gestionado en `balanzas-process-dashboard.tsx`:**
- `activeStageId` — lane activa en el sidebar
- `searchQuery` / `searchResults` — búsqueda de nodos en el canvas
- `zoomPct` — nivel de zoom actual (actualizado via `ProcessEngineHandle`)
- `sidebarCollapsed` — estado del sidebar

---

## BPMN Engine (`balanzas-process-engine.tsx`)

### Lifecycle

1. `useSWR(assetPath, textFetcher)` carga el XML del BPMN.
2. Al recibir el XML, un `useEffect` instancia `NavigatedViewer` (lazy import de `bpmn-js`).
3. Se carga el minimap via `diagram-js-minimap` (también lazy).
4. Se construye el índice de búsqueda (`searchableElements`) iterando el `elementRegistry`.
5. El `eventBus` escucha `element.click` / `element.hover` / `element.out` para selección y hover.
6. Al destruir el componente (cleanup del effect), se llama `viewer.destroy()`.

### `ProcessEngineHandle` (forwardRef API)

El componente expone un handle imperativo al padre via `useImperativeHandle`:

| Método | Descripción |
|---|---|
| `zoomBy(step)` | Aumenta/reduce el zoom relativo (e.g. +0.1) |
| `fitViewport()` | Ajusta el canvas al viewport completo |
| `getZoom()` | Retorna el nivel de zoom actual |
| `scrollToLane(lane)` | Centra el canvas en los elementos de la lane |
| `focusElement(elementId)` | Centra en un elemento específico |
| `searchNodes(query)` | Busca en el índice y retorna `ProcessSearchResult[]` |
| `exportSVG()` | Retorna el SVG del diagrama como string |

### `ViewerApi` (type)

Tipado interno que abstrae el API de `bpmn-js`. Incluye `canvas`, `eventBus`, `elementRegistry`, `overlays`. Definido en `balanzas-process-engine-helpers.ts`.

---

## Sistema de Lanes

Hay 4 rutas (lanes) en el BPMN, definidas en `balanzas-process-stages.ts`:

| Lane ID | Label | Color |
|---|---|---|
| `pre-gv` | Preclasificacion / GV sin pelar | `#2563eb` (azul) |
| `pre-directo` | Preclasificacion / Directo | `#0891b2` (cyan) |
| `apertura-gv-pelado` | Apertura / GV pelado | `#16a34a` (verde) |
| `apertura-apertura` | Apertura / Apertura | `#f97316` (naranja) |

Los colores están centralizados en `BALANZAS_LANE_COLORS` (`balanzas-process-tokens.ts`).

Cada lane tiene:
- `viewportTargetIds` — element IDs a los que centra el canvas al navegar
- `elementNameHints` — fallback por nombre cuando el BPMN cambia y los IDs no coinciden
- `selection` — el `BalanzasProcessSelection` que activa al hacer clic en el sidebar

El mapeado `nodeKey → laneId` vive en `LANE_BY_NODE` (privado). Se accede via `findLaneByNodeKey()` / `findLaneBySelection()`.

---

## Node Binding System

### ¿Qué es un binding?

Cada `BalanzasNodeData` tiene `processBindings: BalanzasProcessBinding[]`. Cada binding mapea un nodo de datos a uno o varios elementos del BPMN por `elementId` exacto:

```typescript
type BalanzasProcessBinding = {
  taskName: string;
  elementId?: string;   // ID exacto del elemento en el BPMN XML
};
```

El match es **strict** (`binding.elementId === element.id`). Los fallbacks por nombre o coordenadas Y fueron eliminados para evitar drift silencioso.

### `validateBindings()` (dev only)

`balanzas-process-binding.ts` expone `validateBindings(nodes, elementRegistry)` y `reportBindingDrift(result)`. Se ejecutan solo en `process.env.NODE_ENV !== 'production'` al inicializar el viewer. Si un `elementId` no existe en el BPMN actual, se loguea una advertencia con la brecha.

**Cuándo usarlo:** cuando el BPMN XML cambia (nuevas tareas, IDs renombrados) y los overlays dejan de aparecer en el lugar correcto.

---

## Overlays (KPI Cards sobre el BPMN)

`buildProcessOverlayElement(node)` en `balanzas-process-engine-helpers.ts` genera un `<button>` HTML que se inserta via la API `overlays.add()` de bpmn-js. No puede usar Tailwind JIT ni CSS custom properties porque está fuera del árbol React.

Los colores de los overlays están en `BALANZAS_OVERLAY_CLASSES` y `BALANZAS_OVERLAY_INLINE_COLORS` (`balanzas-process-tokens.ts`).

> **Excepción de canon:** el uso de colores directos (hex/rgba) en esta capa está documentado en `docs/ui-canon.md` → excepción `.balanzas-process`.

Estructura del overlay:
```
[LANE LABEL — 9px uppercase]
[Node label — 12px bold]
[FocusStage: total — 10.5px]
[ratio · rowCount filas — 10px]
```

---

## Search indexing

Al inicializar el viewer, `balanzas-process-engine.tsx` itera el `elementRegistry` y construye `searchableElements: SearchableProcessElement[]` con todos los elementos que tienen `businessObject.name`. El método `searchNodes(query)` del handle filtra por nombre y retorna resultados con su `BalanzasProcessSelection` para permitir navegación desde la topbar.

---

## Tokens de color

Todos los colores del process engine están centralizados en:

```
src/modules/postcosecha/lib/balanzas-process-tokens.ts
```

| Export | Uso |
|---|---|
| `BALANZAS_LANE_COLORS` | Colores de los 4 puntos de lane en el sidebar |
| `BALANZAS_OVERLAY_CLASSES` | Clases Tailwind del card overlay (aggregate / metric) |
| `BALANZAS_OVERLAY_INLINE_COLORS` | Inline styles rgba para texto dentro del overlay HTML |

---

## Tests

| Archivo | Qué cubre |
|---|---|
| `src/lib/__tests__/balanzas-process-engine-helpers.test.ts` | `centerProcessOnElementIds`, `scrollProcessToLane`, `getNodeMarkerClass`, `isInteractiveProcessNode`, `matchesProcessBinding`, `resolveProcessSelection` |
| `src/lib/__tests__/balanzas-process-stages.test.ts` | Mapping lanes, viewport targeting, aggregate resolution, edge cases null |

---

## Cómo agregar un nodo nuevo

1. Agregar la definición en `BALANZAS_PROCESS_NODES` en `postcosecha-balanzas-core.ts` con `processBindings` correctos.
2. Correr el dev server y navegar a `/dashboard/postcosecha/balanzas`.
3. Abrir la consola; si el binding no encuentra el elemento, `reportBindingDrift()` loguea la discrepancia.
4. Copiar el `id` exacto del elemento desde el log o desde el BPMN XML (`postcosecha-es.bpmn`).
5. Actualizar `elementId` en el binding.
6. Si el nodo es un aggregate (rama), definir `childrenKeys` con los nodeKeys de sus métricas hijas.
