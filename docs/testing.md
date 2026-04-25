# Testing

## Comandos

```bash
npm run test
npm run test:watch
npm run test:coverage
npm run check
npm run e2e:smoke
```

## Regla

`npm run check` debe correr sin DB real ni secretos.

## Cobertura minima

- Formatters compartidos.
- Rate limit y clave de cliente.
- Session secret y rotacion de token.
- RBAC deny by default y prefijos boundary-aware.
- Catalogo de modulos activos/ocultos.
- Cobertura estatica de APIs protegidas.

## Smoke E2E (Playwright, opt-in)

Esqueleto en `tests/e2e/smoke.spec.ts`. Cubre login + marcador runtime + 17 rutas críticas, validando heading, status code y errores de consola.

**No corre en `npm run test`** — vitest excluye `tests/e2e/**`.

Para activarlo localmente:

```powershell
npm install --save-dev @playwright/test
npx playwright install chromium

$env:E2E_BASE_URL = "http://localhost:7777"
$env:E2E_USERNAME = "<usuario>"
$env:E2E_PASSWORD = "<password>"

npm run dev   # en otra terminal
npx playwright test tests/e2e/smoke.spec.ts
```

Cuando los 3 env vars no están definidos, los tests se skipean automáticamente.

## Smoke manual

Rutas criticas:

- `/login`
- `/dashboard`
- `/dashboard/fenograma`
- `/dashboard/mortality`
- `/dashboard/comparacion`
- `/dashboard/campo`
- `/dashboard/productividad`
- `/dashboard/programaciones`
- `/dashboard/postcosecha/balanzas`
- `/dashboard/postcosecha/administrar-maestros/skus`
- `/dashboard/talento-humano/rotacion-laboral`
- `/dashboard/admin/seguridad/usuarios`

Validar light, dark, mobile, tablet y desktop cuando cambie UI.
