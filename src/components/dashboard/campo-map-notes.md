# Campo Map Notes

## Flujo anterior

- `src/lib/campo.ts` mezclaba dos responsabilidades:
  - usar `src/data/campo-blocks-map.json` como lista de bloques resumidos para el dashboard;
  - cruzar esos bloques con `getBlockModalRowsByParentBlocks()` para calcular `stemsIntensity`.
- El render principal en `src/components/dashboard/campo-map.tsx` no usaba ese JSON resumido para geometría.
  - La geometría Leaflet real se cargaba desde `public/data/campo-geo.json`.
  - Esa geometría contiene camas individuales (`bloquePad`, `valveId`, `bedId`), no los paths simplificados del JSON resumido.
- Los rasters del dron ya estaban disponibles como overlays PNG:
  - `public/rasters/ndvi.png`
  - `public/rasters/ndre.png`
  - `public/rasters/lci.png`
  - `public/rasters/bounds.json`
- Tanto el mapa principal como `campo-sub-map-modal.tsx` hacían fetch de geometría y bounds por separado.

## Problemas detectados

- Había una mezcla de fuentes:
  - `campo-blocks-map.json` tenía `100` bloques resumidos;
  - `public/data/campo-geo.json` renderizaba `80` bloques únicos antes del refresh;
  - el shapefile actual (`Capas_Bloque.shp`) ya tenía `81` bloques únicos.
- Existía un desajuste de IDs solo dentro del módulo mapa:
  - el resumen tenía `083`;
  - la geometría real usa `83`.
- El script `scripts/convert-shapefile.mjs` apuntaba a `src/data/campo-geo.json`, pero la app realmente consumía `public/data/campo-geo.json`.
- El raster quedaba visualmente secundario:
  - opacidad fija;
  - sin panes explícitos;
  - bloques operativos seguían con demasiado protagonismo cuando un índice estaba activo.
- Los labels del mapa principal eran útiles, pero todavía demasiado agresivos para lectura agronómica.

## Estrategia aplicada

- Mantener las tarjetas/resumen del encabezado sobre `src/data/campo-blocks-map.json` para no cambiar números visibles.
- Mover la lista de bloques realmente interactivos a la geometría pública (`public/data/campo-geo.json`).
- Normalizar IDs solo dentro del módulo mapa para reconciliar `083` con `83`, sin cambiar contratos externos.
- Centralizar en `campo-explorer.tsx` la carga de:
  - geometría Leaflet;
  - bounds raster;
  - capa activa;
  - opacidad raster.
- Dejar `campo-map.tsx` como renderer puro del mapa principal:
  - panes raster/vector/labels;
  - estilos por modo operativo vs agronómico;
  - leyenda raster;
  - popups e interacciones.
- Dejar `campo-sub-map-modal.tsx` reutilizando los mismos assets y controles raster del mapa principal.
- Mantener intacta la cadena de drill-down del mapa:
  - bloque -> popup con ficha o submapa de valvulas;
  - valvula -> popup con detalle/ficha o submapa de camas;
  - cama -> selector de ciclo y ficha filtrada.

## Ajuste posterior

- Se reforzo `campo-explorer.tsx` con lookup normalizado por bloque para no depender solo del string exacto al abrir la ficha o continuar el drill-down.
- Se mantuvo el modo agronomico, pero ahora comparte tratamiento visual del raster entre mapa principal y submapas:
  - basemap sin etiquetas cuando hay indice activo;
  - opacidad efectiva suavizada por zoom;
  - labels de bloques mas discretas y contextuales.

## Archivos refactorizados

- `src/lib/campo.ts`
- `src/components/dashboard/campo-explorer.tsx`
- `src/components/dashboard/campo-map.tsx`
- `src/components/dashboard/campo-sub-map-modal.tsx`
- `scripts/convert-shapefile.mjs`
- `public/data/campo-geo.json`

## Estado actual del contrato raster

- El frontend sigue usando el pipeline real existente:
  - GeoTIFF procesado offline;
  - PNG clasificado consumido con `ImageOverlay`;
  - bounds servidos por `public/rasters/bounds.json`.
- No se agregó decodificación de GeoTIFF en navegador.
- No se agregó tileserver ni backend raster nuevo.
- La leyenda evita rangos numéricos inventados y presenta la capa como raster clasificado.
