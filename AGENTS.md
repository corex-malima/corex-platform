# AGENTS.md

Guia operativa para agentes que trabajen en este repo.

## Comandos

```bash
npm run dev          # Next.js 16.1.1 con Webpack
npm run build
npm run start
npm run typecheck
npm run lint
npm run test
npx vitest run src/lib/__tests__/server-cache.test.ts
```

## Arquitectura actual

**Stack:** Next.js 16.1.1, React 19, TypeScript 5.9, Tailwind CSS 4, PostgreSQL via `pg`, SWR en cliente.

### Frontera de capas

```text
src/app -> src/modules -> src/shared + src/lib
```

### Flujo de datos

1. `page.tsx` server valida acceso y carga datos iniciales.
2. El loader server reutiliza helpers de `src/modules/shared/server-page.tsx`.
3. La UI de pantalla vive en `src/modules/*`.
4. Los explorers legacy en `src/components/dashboard/*` quedan como piezas de UI internas o transicionales.
5. Las APIs llaman `requireAuth()` y quedan protegidas por reglas explicitas en `src/lib/access-control.ts`.

### Fuente de verdad de modulos

`src/config/module-catalog.ts` define:

- ruta
- titulo
- eyebrow
- resumen
- grupo de navegacion
- estado del modulo (`active | hidden | internal`)
- visibilidad movil

Desde ahi se derivan:

- `src/config/sidebar-data.ts`
- `src/config/dashboard.ts`
- recursos RBAC visibles

### Modulos visibles hoy

- Campo
- Fenograma
- Mortandades
- Comparacion
- Productividad
- Programaciones
- Balanzas
- Administrar SKU's
- Clasificacion en blanco
- Talento Humano
- Usuarios

Las rutas placeholder siguen existiendo solo como rutas ocultas; no deben volver a aparecer en navegacion sin funcionalidad real.

## Auth y seguridad

- Cookie `wh-session`, firma HMAC-SHA256, expiracion 24h.
- `SESSION_SECRET` obligatorio en produccion.
- En desarrollo, el secreto se deriva del workspace; ya no se usa un secreto fijo hardcodeado.
- `ALLOW_ENV_ADMIN_BYPASS` sigue limitado a no-produccion.
- Las APIs protegidas usan `deny by default`.
- `/api/health/db` es `superadmin-only`.
- `/api/programaciones/debug` es `internal-dev-only`.

## Convenciones importantes

- No introducir placeholders visibles como si fueran modulos listos.
- Si una pagina nueva nace, debe registrarse primero en `src/config/module-catalog.ts`.
- Si una API nueva usa `requireAuth()`, debe quedar mapeada en `src/lib/access-control.ts`.
- Mantener errores API en shape compatible `{ message, error }`.

## Restricciones

- No agregar `connectionTimeoutMillis` ni `statement_timeout` a `src/lib/db.ts`.
- `next.config.ts` necesita `unsafe-inline`, `unsafe-eval` y `ws:` en CSP para que Next funcione.
- `@/*` apunta a `./src/*`.
