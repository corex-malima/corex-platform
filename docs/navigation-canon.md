# Canon de navegación

Este documento es el contrato vigente para crear, ubicar, nombrar y enlazar módulos en CoreX.
La fuente de verdad técnica sigue siendo `src/config/module-catalog.ts`; desde ahí se derivan
sidebar, Inicio, navegación móvil, labels visibles de RBAC y contexto de página.

## Decisión principal

Las rutas existentes quedan congeladas como contrato estable. No se renombran ni se eliminan.

Los módulos nuevos deben nacer con el canon nuevo.

Esto evita romper permisos, bookmarks, links internos, refresh directo, tests, documentación histórica
y APIs que ya usan rutas antiguas como `resourceKey`.

## Regla de oro

- Módulo existente: conservar `href` actual y ordenar visualmente con `navigationGroup`, `trail`, `label`, `title` y `eyebrow`.
- Módulo nuevo: crear `href` canónico desde el inicio.
- Módulo existente que necesite URL nueva: crear alias o redirect primero; nunca borrar la ruta vieja de golpe.
- Permisos existentes: conservar `resourceKey` estable.
- Permisos nuevos: usar el `href` canónico del módulo nuevo.

## Fuente de verdad

Todo módulo visible o gestionable debe registrarse primero en `src/config/module-catalog.ts`.

Campos obligatorios:

- `key`: identificador técnico estable del módulo.
- `label`: texto corto usado en sidebar.
- `title`: título de pantalla.
- `eyebrow`: jerarquía visual completa.
- `summary`: propósito funcional.
- `href`: ruta real del App Router.
- `icon`: icono.
- `navigationGroup`: macrosección interna.
- `trail`: jerarquía dentro de la macrosección.
- `accessSection`: sección visible en administración de permisos.
- `status`: `active`, `hidden` o `internal`.

Campos opcionales recomendados:

- `quickAccess`: `true` si debe aparecer en accesos rápidos de Inicio.
- `keywords`: palabras extra para el buscador global.
- `mobileVisible`: `false` si no debe aparecer en navegación móvil.

No crear listas paralelas hardcodeadas para sidebar o Inicio.

## Macrosecciones visibles

```text
CoreX
├─ Inicio
├─ Analítica
├─ Gestión
└─ Administración
```

`Sistema` se habilita solo cuando existan módulos técnicos reales como páginas de producto
(jobs, logs, monitoreo, health checks operativos, auditoría técnica). No se muestran ramas vacías.

## Qué va en cada macrosección

### Inicio

Centro de navegación. Debe usar el catálogo central, no una lista aparte.

Debe contener:

- Buscador global.
- Tarjetas de macrosecciones.
- Accesos rápidos.
- Entrada por dominio.
- Recientes y favoritos si es viable sin backend.
- Estado general solo si existen datos reales.

### Analítica

Vistas de análisis, indicadores, KPI, comparaciones, tableros y seguimiento visual.

Estructura:

```text
Analítica / Dominio / Tipo de métrica / Vista
```

Tipo de métrica vigente:

- `Indicadores & KPI`

`OKR` no debe aparecer hasta que existan módulos reales.

### Gestión

Operación diaria, registros, planificación y ejecución de procesos.

Estructura:

```text
Gestión / Dominio / Proceso / Módulo
```

Ejemplos:

- `Gestión / Campo / Planificación / Programaciones`
- `Gestión / Talento Humano / Registros / Seguimientos`
- `Gestión / Postcosecha / Planificación / Solver / Clasificación en blanco`

### Administración

Configuración, maestros, catálogos, unidades, métricas, metas, usuarios y permisos.

Estructura:

```text
Administración / Alcance / Dominio o entidad / Maestro
```

Alcances vigentes:

- `Maestros globales`
- `Maestros por dominio`
- `Seguridad`

## Estructura vigente del sidebar

```text
Analítica
├─ Campo
│  └─ Indicadores & KPI
│     ├─ Comparación
│     ├─ Fenograma
│     ├─ Mapa
│     ├─ Mortalidad
│     └─ Productividad
├─ Postcosecha
│  └─ Indicadores & KPI
│     └─ Balanzas
├─ Calidad
│  └─ Indicadores & KPI
│     └─ Punto de apertura
└─ Talento Humano
   └─ Indicadores & KPI
      ├─ Composición laboral
      ├─ Demografía del personal
      ├─ Rotación laboral
      └─ Seguimientos

Gestión
├─ Bodega
│  └─ Planificación
│     └─ Programaciones
├─ Campo
│  └─ Planificación
│     └─ Programaciones
├─ Postcosecha
│  └─ Planificación
│     └─ Solver
│        └─ Clasificación en blanco
└─ Talento Humano
   └─ Registros
      └─ Seguimientos

Administración
├─ Maestros globales
│  ├─ Catálogos
│  ├─ Dominios
│  ├─ Metas y objetivos
│  ├─ Métricas
│  └─ Unidades
├─ Maestros por dominio
│  ├─ Bodega
│  │  ├─ Catálogos
│  │  ├─ Presentaciones y conversiones
│  │  ├─ Productos
│  │  └─ Unidades
│  ├─ Campo
│  │  └─ Programación Drench
│  ├─ Laboratorio
│  │  ├─ Recetas de productos
│  │  └─ Tipos de elaboración
│  ├─ Postcosecha
│  │  └─ SKU's
│  └─ Talento Humano
│     ├─ Catálogos
│     └─ Dominios
└─ Seguridad
   └─ Usuarios
```

## Política de rutas

### Rutas existentes

Las rutas existentes se mantienen aunque visualmente vivan en una jerarquía nueva.

Ejemplos:

| Módulo | Ruta estable | Ubicación visible |
|---|---|---|
| Productividad | `/dashboard/productividad` | `Analítica / Campo / Indicadores & KPI / Productividad` |
| Balanzas | `/dashboard/postcosecha/balanzas` | `Analítica / Postcosecha / Indicadores & KPI / Balanzas` |
| Seguimientos Trabajo Social | `/dashboard/talento-humano/seguimientos` | `Gestión / Talento Humano / Registros / Seguimientos` |
| Productos Bodega | `/dashboard/bodega/administrar-maestros/productos` | `Administración / Maestros por dominio / Bodega / Productos` |
| Métricas | `/dashboard/admin/administracion-maestros/metricas` | `Administración / Maestros globales / Métricas` |

No cambiar estas rutas salvo migración explícita con alias, redirect y QA.

### Rutas nuevas

Los módulos nuevos deben usar rutas canónicas desde el primer commit.

Patrones:

```text
/analitica/<dominio>/indicadores-kpi/<vista>
/gestion/<dominio>/<proceso>/<modulo>
/administracion/maestros-globales/<maestro>
/administracion/maestros-dominio/<dominio>/<maestro>
/administracion/seguridad/<modulo>
/sistema/<componente-tecnico>/<modulo>
```

Ejemplos:

```text
/analitica/campo/indicadores-kpi/rendimiento-camas
/gestion/talento-humano/registros/entrevistas
/administracion/maestros-globales/periodos
/administracion/maestros-dominio/postcosecha/turnos
/administracion/seguridad/auditoria
```

No crear rutas nuevas bajo `/dashboard/...` salvo que sea una pantalla hija de un módulo existente y
mantenerla ahí sea claramente menos riesgoso.

## Política de aliases y redirects

Si un módulo existente necesita adoptar una ruta canónica:

1. Crear primero la ruta canónica nueva.
2. Mantener la ruta antigua funcionando.
3. Hacer que ambas rutas apunten al mismo componente o loader.
4. Mantener el `resourceKey` antiguo si los permisos existentes dependen de él.
5. Agregar `legacy_paths` o documentación equivalente si se incorpora ese campo al catálogo.
6. Actualizar links internos hacia la ruta canónica.
7. Validar refresh directo en ambas rutas.
8. Retirar la ruta vieja solo con decisión explícita y después de QA.

Mientras no exista necesidad fuerte, no migrar URLs antiguas.

## Contrato de permisos

El permiso visible y la autorización de página/API dependen de rutas estables.

Reglas:

- `href` funciona como `resourceKey` principal en módulos actuales.
- `requirePageAccess()` debe seguir usando el `resourceKey` existente del módulo viejo.
- `API_ACCESS_RULES.requiredResources` debe seguir apuntando al `resourceKey` estable.
- Cambiar `eyebrow`, `trail` o `navigationGroup` no debe cambiar permisos por sí solo.
- Si un módulo nuevo nace con ruta canónica, ese `href` canónico será su `resourceKey`.

No cambiar permisos durante una reorganización visual salvo que el objetivo explícito sea migrar RBAC.

## Contrato para `module-catalog`

Ejemplo de módulo existente migrado visualmente:

```ts
{
  key: "campo-productividad",
  label: "Productividad",
  title: "Productividad",
  eyebrow: "Analítica / Campo / Indicadores & KPI",
  summary: "Productividad de mano de obra: horas por caja por ciclo y etapa operativa.",
  href: "/dashboard/productividad",
  navigationGroup: "Dashboard",
  trail: ["Campo", "Indicadores & KPI"],
  accessSection: "Analítica / Indicadores & KPI",
  status: "active",
  quickAccess: true,
}
```

Ejemplo de módulo nuevo canónico:

```ts
{
  key: "campo-rendimiento-camas",
  label: "Rendimiento camas",
  title: "Rendimiento camas",
  eyebrow: "Analítica / Campo / Indicadores & KPI",
  summary: "Vista de rendimiento por cama y semana.",
  href: "/analitica/campo/indicadores-kpi/rendimiento-camas",
  navigationGroup: "Dashboard",
  trail: ["Campo", "Indicadores & KPI"],
  accessSection: "Analítica / Indicadores & KPI",
  status: "active",
}
```

Nota: `navigationGroup: "Dashboard"` queda como key interna de compatibilidad para Analítica. El label
visible correcto es `Analítica`.

## Labels canónicos

Usar estos nombres visibles:

- `Analítica`, no `Dashboard`.
- `Indicadores & KPI`, no `Indicadores`.
- `Mortalidad`, no `Mortandades`.
- `Demografía del personal`, no `Demografía personal`.
- `Seguimientos`, no `Indicador seguimientos`.
- `Planificación`, no `Planificacion`.
- `Programación Drench`, no `Programacion Drench`.
- `Catálogos`, no `Configurar catalogo`.
- `Recetas de productos`, no `Receta de productos`.
- `Tipos de elaboración`, no `Tipos de elaboracion`.
- `SKU's`, no `Administrar SKU's`.
- `Metas y objetivos`, no `Metas & Objetivos`.
- `Maestros globales`, no `Administración Maestros`.
- `Maestros por dominio`, no `Administrar Maestros`.

## Decisión sobre Programación Drench

`Programación Drench` vive en `Administración / Maestros por dominio / Campo` porque administra reglas
editables de drench por semana fenológica, tipo de ciclo y variedad. No es una agenda operativa.

Si en el futuro nace una agenda o ejecución real de drench, esa nueva pantalla debe vivir en:

```text
Gestión / Campo / Planificación / [módulo operativo]
```

## Contrato de Inicio

`/dashboard` funciona como centro de navegación.

Debe derivar todo del catálogo:

- Buscador por `key`, `label`, `title`, `eyebrow`, `summary`, `trail` y `keywords`.
- Tarjetas de macrosecciones reales.
- Máximo ocho accesos rápidos desde `quickAccess`.
- Entrada por dominio derivada de módulos visibles y permisos.
- Recientes y favoritos con `localStorage`, sin backend obligatorio.
- No mostrar estado general si no hay endpoint o datos reales.

No duplicar módulos manualmente en JSX si ya existen en `module-catalog`.

## Checklist para crear un módulo nuevo

1. Definir si es `Analítica`, `Gestión`, `Administración` o `Sistema`.
2. Definir dominio real: Campo, Postcosecha, Bodega, Laboratorio, Talento Humano, Calidad o Global.
3. Crear ruta canónica si es nuevo.
4. Registrar primero en `src/config/module-catalog.ts`.
5. Usar `eyebrow` completo con el canon.
6. Usar `trail` según la jerarquía visible.
7. Definir `accessSection` coherente.
8. Agregar `quickAccess` solo si debe estar entre los accesos principales.
9. Crear `page.tsx` con `requirePageAccess()` o `loadProtectedPageData()`.
10. Si crea API protegida, agregar regla explícita en `src/lib/access-control.ts`.
11. Reutilizar componentes según `docs/reuse-index.md`.
12. Validar `typecheck`, `canon:check`, `lint` y tests aplicables.

## Checklist para mover visualmente un módulo existente

1. No cambiar `href`.
2. No cambiar `requirePageAccess()`.
3. No cambiar `API_ACCESS_RULES.requiredResources`.
4. Cambiar solo `label`, `title`, `eyebrow`, `navigationGroup`, `trail` y `accessSection` si aplica.
5. Actualizar textos visibles hardcodeados en el componente.
6. Actualizar docs activas.
7. Validar sidebar, Inicio, header y RBAC visible.
8. Probar refresh directo en la ruta vieja.

## Validación mínima

Comandos esperados antes de cerrar:

```bash
npm run typecheck
npm run lint
npm run test
npm run canon:check
```

Si `npm` no está disponible en la sesión, usar el runtime Node empaquetado del workspace y ejecutar los
scripts equivalentes sin instalar dependencias.

Para build en este repo, el modo estable validado es:

```bash
next build --webpack
```

Turbopack puede fallar en Windows por `leaflet.css` con `Acceso denegado`; ese fallo no invalida el
contrato de navegación si Webpack compila correctamente.

## No hacer

- No crear ramas vacías en sidebar.
- No crear módulos placeholder visibles.
- No duplicar el mismo módulo en dos macrosecciones.
- No mover maestros a Gestión.
- No mover operación diaria a Administración.
- No usar `Sistema` para módulos de negocio.
- No cambiar rutas existentes solo por estética.
- No cambiar permisos durante una migración visual.
- No crear buscadores o quick access hardcodeados fuera del catálogo.
