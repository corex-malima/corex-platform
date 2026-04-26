# Balanzas — Process Diagram Engine

> Reemplazó al viewer bpmn-js anterior. Toda la lógica de coordenadas,
> conectores y overlays vive ahora en SVG hand-crafted. Más control visual,
> sin dependencia runtime de bpmn-js para este módulo.

---

## Stack

| Capa | Archivo |
|------|---------|
| Renderer SVG | `src/modules/postcosecha/components/balanzas-process-svg-viewer.tsx` |
| Layout (coords + IDs) | `src/modules/postcosecha/components/balanzas-svg-layout.ts` |
| Subcomponentes (Edges/Notes/Labels/StaticShapes) | `src/modules/postcosecha/components/balanzas-svg-parts.tsx` |
| Colores (CSS vars) | `src/app/globals.css` (`--bal-*`) |
| Modal detalle | `src/modules/postcosecha/components/balanzas-node-detail-dialog.tsx` |
| Selector global Tallos/Peso | `src/modules/postcosecha/components/balanzas-metric-selector.tsx` |
| Datos + nodos | `src/lib/postcosecha-balanzas-core.ts` |

bpmn-js sigue como dep para Fenograma (`process-viewer-overlay.tsx`), no para Balanzas.

---

## Contrato

1. **`NODE_LAYOUT` es la fuente de verdad** de las posiciones SVG.
   Cada uno de los 40 IDs de Task tiene `{ cx, cy, w, h, kind }`.
2. **`BalanzasNodeSummary` declara su binding** vía `bpmnElementId` (1 overlay)
   o `bpmnByDestination` (3 overlays virtuales — uno por destino).
3. **El explorer** (`balanzas-explorer.tsx`) traduce nodos → `processNodes`
   filtrando por modo Tallos/Peso (`nodeMatchesMetricMode`) y expandiendo
   los splits por destino (`toProcessNodes`).
4. **El viewer** mapea `processBindings[].elementId` → `NODE_LAYOUT[id]` y
   renderiza un overlay HTML clickeable centrado arriba del nodo SVG.

Si un `bpmnElementId` no existe en `NODE_LAYOUT`, el overlay simplemente no
se renderiza (no rompe el render del SVG completo).

---

## Layout

ViewBox `2200×1450`. 4 rows con gaps de ~370px:

| Row | Centerline Y | Sub-rows ARC/BLC/TNT (offsets ±100) |
|-----|--------------|-------------------------------------|
| Pre GV | 200 | 100 / 200 / 300 |
| Pre Directo | 570 | 470 / 570 / 670 |
| (raíz central) | 750 | — |
| Apertura GV | 930 | 830 / 930 / 1030 |
| Apertura Directo | 1300 | 1200 / 1300 / 1400 |

X columns: start=80, gwRaiz=180, b1=290, gwRutas=410, max10=540, pelado=680,
b1ab=830, hidrata=960, b2=1080, gwDest=1200, clasif=1340, clasifA=1410,
b3b2a=1580, gwCierre=1700, general=1820, gwGlobal=1980, end=2080.

---

## Overlays (cards de métricas)

- Anchor: `top: (cy - h/2 - 4) * zoom`, `left: cx * zoom` + `-translate-x-1/2 -translate-y-full`
  → la card se centra horizontal sobre el nodo y queda 4px arriba del border superior.
- Width estándar: `168px` con 3 métricas máx.
- Width compacto (nodos split por destino, key contiene `::`): `140px` con 1 métrica.
- Selección: `border-blue-700` + `bg-white` cuando `node.key === selectedNodeKey`.
- `status === "unavailable"`: paleta gris atenuada (no oculta, sigue visible).

---

## Datos (`BalanzasNodeSummary`)

Definidos en `src/lib/postcosecha-balanzas-core.ts` (`BALANZAS_NODES`).
19 nodos × 1-3 destinos = hasta 19 overlays según el modo Tallos/Peso activo
+ los nodos especiales `-ideal`, `-ideal-grade`, `-b2-b3-weight`, `-b2-b2a-weight`
que se muestran siempre.

Campo clave por nodo:

```ts
{
  key: "apertura-b1c-b2-weight",
  label: "B1C → B2",
  shortLabel: "B1C → B2",
  dialogTitle: "Apertura - B1C vs B2 - Peso",
  branch: "apertura",
  metrics: [...],
  bpmnElementId: "Task_B2_Apertura_Max10",     // 1 overlay
  // OR
  bpmnByDestination: {                          // 3 overlays virtuales
    arcoiris: "Task_B2A_Apertura_Max10_Arcoiris",
    blanco:   "Task_B2A_Apertura_Max10_Blanco",
    tinturado:"Task_B2A_Apertura_Max10_Tinturado",
  },
}
```

---

## Modal de detalle

`BalanzasNodeDetailDialog` (DialogShell central, `max-w-7xl`):
- Título canónico: `node.dialogTitle` con sufijo `· Arcoíris` si vino de un overlay split por destino
- KpiGrid con 3-4 métricas
- FilterPanel local: agrupación + multi-select Destino/Grado/Grupo
- Tabla expandible con toda la fila de detalle + botón CSV
- Cuando se abre desde un overlay split, `presetDestination` pre-aplica el filtro Destino

---

## Cómo agregar/cambiar un nodo

1. Editar `BALANZAS_NODES` en `src/lib/postcosecha-balanzas-core.ts` —
   añadir el nuevo nodo con `bpmnElementId` (o `bpmnByDestination`).
2. Si el `elementId` es nuevo, añadirlo al `NODE_LAYOUT` y `TASK_LABELS` en
   `balanzas-svg-layout.ts` con coordenadas + label visible.
3. Si la nueva conexión cambia el flow, añadir el `<path>` en
   `Edges` (en `balanzas-svg-parts.tsx`).
4. Ejecutar `npm run typecheck && npm run canon:check && npm run lint`.
