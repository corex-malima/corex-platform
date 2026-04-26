# Module Contracts

## Frontera obligatoria

```text
src/app -> src/modules -> src/shared + src/lib
```

Reglas:
- `src/app` no debe saltarse `src/modules` para meter UI visible de producto
- `src/modules` no debe crear dependencias nuevas hacia `src/components/dashboard`
- imports cruzados entre modulos estan prohibidos salvo:
  - `src/shared/*`
  - `src/lib/*`
  - `src/config/*`
  - `src/hooks/*` compartidos

## Contrato de pagina

Toda pagina dashboard debe:
- vivir en `src/app/(dashboard)/dashboard/**/page.tsx`
- validar acceso con `requirePageAccess` o `loadProtectedPageData`
- mapearse al catalogo si es visible o gestionada
- usar `DashboardRouteError` si el loader puede fallar

## Contrato de modulo nuevo

Todo modulo nuevo debe tener:
- un componente raiz visible del modulo
- subcomponentes internos bajo `src/modules/<modulo>/components`
- loader/server contract si hay datos iniciales
- tests minimos segun impacto
- documentacion de excepciones si rompe el canon UX/UI

`src/components/dashboard` queda congelado para legacy.

## Contrato de API

Toda API protegida debe:
- llamar `requireAuth(request)`
- tener regla explicita en `src/lib/access-control.ts`
- responder errores compatibles `{ message, error }`
- no exponer stack traces en produccion
- usar `requestId` en rutas nuevas o helpers modernizados

## Contrato de datos

- queries compartidas e infraestructura en `src/lib`
- mappers de pantalla en `src/modules/<modulo>`
- UI reusable en `src/shared`
- fetch cliente por `@/lib/fetch-json`
- formatters por `@/shared/lib/format`
- `pct_mortality` debe tratarse como campo calculado en SQL/fuente de datos; los mappers TS solo normalizan o formatean, no redefinen la formula

## Politica de TEMPORARY_SHIM

Si un archivo transicional vive en `src/components/dashboard/*`, debe cumplir todo:
- comentario `TEMPORARY_SHIM` en la primera linea
- fuente de verdad declarada
- fecha objetivo de retiro en comentario o documento asociado
- listado en `docs/quality-baseline.md`

## Limites de crecimiento

- UI nueva: maximo recomendado 350 lineas por componente
- dominio/query nueva: maximo recomendado 700 lineas por archivo
- cualquier excepcion requiere plan de split documentado

## Balanzas SVG binding contract

El viewer del proceso Balanzas (`/dashboard/postcosecha/balanzas`) ya no usa
bpmn-js. Es un **SVG hand-crafted** (`balanzas-process-svg-viewer.tsx`) que
mapea cada `elementId` BPMN-style a coordenadas explícitas en `NODE_LAYOUT`
(`balanzas-svg-layout.ts`). Contrato:

- Cada entrada en `BalanzasNodeSummary.processBindings` (vía `bpmnElementId`
  o `bpmnByDestination[arc|blc|tnt]`) DEBE existir como key en `NODE_LAYOUT`.
- `NODE_LAYOUT` declara `{ cx, cy, w, h, kind: "task" | "general" }` por cada
  uno de los 40 IDs de balanza; añadir/renombrar IDs en
  `src/lib/postcosecha-balanzas-core.ts` requiere sincronizar `NODE_LAYOUT`.
- Los overlays HTML (cards de métricas) se posicionan con
  `style={{ left: rect.cx*zoom, top: (rect.cy-rect.h/2-4)*zoom }}` +
  `-translate-x-1/2 -translate-y-full`, anclando la card centrada arriba
  del nodo bound.
- Nodos split por destino (key contiene `::`) renderizan card ULTRA-compacta
  (140px wide, 1 métrica) para evitar solape entre las 3 sub-rows ARC/BLC/TNT.
- La UI de detalle se abre vía `BalanzasNodeDetailDialog` (DialogShell central,
  no SheetShell lateral). El selector global Tallos vs Peso filtra qué overlays
  son visibles (sufijo `-stems` vs `-weight`); nodos especiales (`-ideal`,
  `-ideal-grade`, `-b2-b3-weight`, `-b2-b2a-weight`) se muestran siempre.
