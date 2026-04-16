# Como extender el dashboard

## 1. Objetivo

Este documento describe la forma recomendada de crear un dashboard nuevo sobre la base actual sin romper la arquitectura existente.

## 2. Patron recomendado

La secuencia correcta es esta:

1. definir el dominio
2. definir la pagina
3. definir la API si hace falta interaccion cliente
4. crear los componentes del modulo
5. registrar el modulo en la navegacion
6. documentar el modulo

Ese orden importa porque evita empezar por la UI sin tener claro el contrato de datos.

## 3. Paso a paso

## 3.1. Crear la libreria de dominio

Ubicacion sugerida:

- `src/lib/nombre-del-modulo.ts`

Responsabilidad:

- tipos del modulo
- filtros por default
- consultas SQL
- agregaciones
- transformacion de nombres a formato de UI

Regla:

- no meter SQL pesado dentro de la pagina o dentro del componente cliente

## 3.2. Crear la pagina server

Ubicacion sugerida:

- `src/app/(dashboard)/dashboard/nombre-del-modulo/page.tsx`

Responsabilidad:

- pedir datos iniciales
- renderizar el componente principal del modulo

Usa pagina server si quieres que la vista abra ya con datos listos.

## 3.3. Crear API si el modulo sera interactivo

Ubicacion sugerida:

- `src/app/api/nombre-del-modulo/...`

Usa API cuando:

- la UI cambia filtros sin recargar toda la pagina
- hay modales o drilldown bajo demanda
- necesitas separar bootstrap inicial de fetch incremental

No la uses si la pagina es totalmente estatica y no tiene interaccion cliente.

## 3.4. Crear componente cliente si hace falta estado

Ubicacion sugerida:

- `src/components/dashboard/nombre-del-modulo-explorer.tsx`

Responsabilidad:

- filtros
- fetch incremental
- apertura de modales
- control visual del modulo

## 3.5. Crear componentes visuales especializados

Ubicacion sugerida:

- `src/components/dashboard/`

Ejemplos:

- tabla del modulo
- panel resumen
- grafica
- modal

## 3.6. Registrar el modulo en la configuracion

Editar:

- `src/config/dashboard.ts`

Agregar al menos:

- `slug`
- `title`
- `eyebrow`
- `summary`
- `href`
- `icon`

Si el modulo debe vivir en el sidebar jerarquico, agregarlo o asegurarse de que `dashboardViews` ya lo inyecte en la rama correcta.

## 3.7. Documentar el modulo

Agregar al menos:

- seccion en `README.md`
- documento propio en `docs/` si el modulo es importante
- endpoints nuevos en `docs/apis.md` si aplica

## 4. Patron minimo para un modulo real

```text
src/
  lib/mi-modulo.ts
  app/
    (dashboard)/dashboard/mi-modulo/page.tsx
    api/mi-modulo/route.ts
  components/
    dashboard/mi-modulo-explorer.tsx
    dashboard/mi-modulo-table.tsx
```

## 5. Reglas de diseno tecnico

### 5.1. Mantener el dominio fuera de la UI

Si el modulo necesita transformar columnas, ordenar, agrupar o resumir, eso va en `src/lib`, no en JSX.

### 5.2. Nombrar para negocio

Aunque la base use nombres feos o demasiado tecnicos, la UI debe exponer nombres claros para presentacion.

### 5.3. No acoplar el sidebar a la pagina

La pagina no debe decidir por si sola como se navega. La navegacion se registra en `src/config/dashboard.ts`.

### 5.4. Preferir bootstrap server

Si el modulo abre mejor con datos iniciales listos, usar pagina server para el primer render. Luego agregar fetch cliente solo donde haga falta.

### 5.5. Documentar filtros y supuestos

Todo modulo real necesita dejar claro:

- filtros por defecto
- rango temporal
- columnas clave
- supuestos de negocio
- fuentes SQL usadas

## 6. Checklist para un modulo nuevo

Antes de darlo por terminado, verificar:

1. existe pagina en `app/`
2. existe dominio en `lib/`
3. si hay interaccion, existe API
4. el modulo aparece en el sidebar
5. el modulo pasa `lint`, `typecheck` y `build`
6. la documentacion fue actualizada

## 7. Antipatrones a evitar

- meter SQL dentro de la pagina
- meter toda la logica dentro de un componente cliente
- reutilizar piezas de `borrar/` sin reescribirlas con criterio
- mostrar nombres crudos de base que no sirven para presentacion
- crear un modulo sin registrarlo en `src/config/dashboard.ts`

## 8. Ruta recomendada para el siguiente modulo real

Dado el estado actual del repo, la evolucion mas natural es:

1. reemplazar el seed de `Comparacion` por datos reales
2. repetir el patron que hoy ya demostro funcionar en `Fenograma`
3. documentar el nuevo dominio desde el inicio para no volver a depender del contexto oral de la implementacion
