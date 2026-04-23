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

## Balanzas BPMN binding contract

El viewer BPMN de Postcosecha/Balanzas (`/dashboard/postcosecha/balanzas`) vincula cada nodo de datos con un elemento del BPMN XML por `elementId` exacto. El contrato es estricto:

- Cada entrada en `BalanzasNodeData.processBindings` DEBE declarar un `elementId` que corresponda a un `<bpmn:task>` presente en `public/processes/postcosecha-es.bpmn`.
- Se eliminaron los fallbacks fuzzy (`minY/maxY` y match por nombre). `matchesProcessBinding` solo compara `binding.elementId === element.id` (ver `src/modules/postcosecha/lib/balanzas-process-engine-helpers.ts`).
- `validateBindings` (en `src/modules/postcosecha/lib/balanzas-process-binding.ts`) corre tras cada `importXML` del viewer. En desarrollo (`NODE_ENV !== "production"`), si hay drift se emite `console.warn` con nodo, task y elementId faltantes.
- Cambios en el BPMN XML (renombrar `<bpmn:task id>`, borrar tasks, reestructurar lanes) requieren sincronizar `processBindings[].elementId` en `src/lib/postcosecha-balanzas-core.ts`. De lo contrario los nodos afectados pierden highlight y click.
- Nodos marcados `isInteractiveProcessNode === false` (raices `b1_preclasificacion`, `b1_apertura`) no se validan porque son decorativos.
- La UI de detalle es una sola superficie: panel inline (`BalanzasProcessNodePanel`, tabs Resumen/Desglose/Metadatos) + drawer expandible (`BalanzasNodeDetailSheet` via `SheetShell`). No se reintroduce `DialogShell` para este flujo.
