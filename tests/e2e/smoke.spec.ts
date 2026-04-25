/**
 * Smoke E2E mínimo (opt-in).
 *
 * Este archivo es un esqueleto. Para ejecutarlo:
 *
 *   1. Instalar Playwright:        `npm install --save-dev @playwright/test`
 *   2. Instalar navegadores:       `npx playwright install chromium`
 *   3. Configurar variables:
 *        $env:E2E_BASE_URL = "http://localhost:7777"
 *        $env:E2E_USERNAME = "<usuario>"
 *        $env:E2E_PASSWORD = "<password>"
 *   4. Levantar la app en otra terminal:  `npm run dev`
 *   5. Ejecutar:                          `npx playwright test tests/e2e/smoke.spec.ts`
 *
 * El script `npm run e2e:smoke` actualmente solo recuerda este flujo.
 * Habilitarlo en CI requiere las dependencias arriba.
 *
 * Validación cubierta (cuando se activa):
 * - Login flow con credenciales reales
 * - Marcador runtime presente con el commit actual
 * - Cada ruta crítica responde 200 y renderiza su h1 esperado
 * - No hay errores de consola al navegar
 *
 * NO importa al pipeline `npm run check` — vitest excluye `tests/e2e/**`.
 */

// @ts-expect-error — Playwright es opt-in; el import resuelve solo si está instalado.
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:7777";
const USERNAME = process.env.E2E_USERNAME ?? "";
const PASSWORD = process.env.E2E_PASSWORD ?? "";

const CRITICAL_ROUTES: Array<{ path: string; expectedHeading: RegExp }> = [
  { path: "/dashboard", expectedHeading: /dashboard|inicio|workspace/i },
  { path: "/dashboard/campo", expectedHeading: /campo|mapa/i },
  { path: "/dashboard/fenograma", expectedHeading: /fenograma/i },
  { path: "/dashboard/mortality", expectedHeading: /mortandades/i },
  { path: "/dashboard/comparacion", expectedHeading: /comparaci[oó]n/i },
  { path: "/dashboard/productividad", expectedHeading: /productividad/i },
  { path: "/dashboard/programaciones", expectedHeading: /programaciones/i },
  { path: "/dashboard/postcosecha/balanzas", expectedHeading: /balanzas/i },
  { path: "/dashboard/postcosecha/administrar-maestros/skus", expectedHeading: /sku/i },
  { path: "/dashboard/postcosecha/planificacion/solver/clasificacion-en-blanco", expectedHeading: /clasificaci[oó]n/i },
  { path: "/dashboard/talento-humano/composicion-laboral", expectedHeading: /composici[oó]n/i },
  { path: "/dashboard/talento-humano/demografia-personal", expectedHeading: /demograf[ií]a/i },
  { path: "/dashboard/talento-humano/rotacion-laboral", expectedHeading: /rotaci[oó]n/i },
  { path: "/dashboard/calidad/punto-apertura", expectedHeading: /punto.*apertura/i },
  { path: "/dashboard/admin/seguridad/usuarios", expectedHeading: /usuarios/i },
  { path: "/dashboard/mi-cuenta", expectedHeading: /mi cuenta/i },
  { path: "/dashboard/mi-trabajo", expectedHeading: /workspace|mi trabajo/i },
];

test.describe("CoreX smoke", () => {
  test.skip(!USERNAME || !PASSWORD, "Requiere E2E_USERNAME y E2E_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="username"]', USERNAME);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  });

  test("marcador runtime visible con commit", async ({ page }) => {
    const marker = page.locator('[role="status"][aria-live="off"]');
    await expect(marker).toContainText(/Audit final runtime check/);
  });

  for (const { path, expectedHeading } of CRITICAL_ROUTES) {
    test(`ruta ${path} carga sin error`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      const response = await page.goto(`${BASE_URL}${path}`);
      expect(response?.status()).toBeLessThan(400);

      const heading = page.locator("h1").first();
      await expect(heading).toBeVisible({ timeout: 8_000 });
      await expect(heading).toHaveText(expectedHeading);

      // Permitimos warnings, fallamos solo en errors críticos
      const criticalErrors = consoleErrors.filter(
        (msg) => !msg.includes("Download the React DevTools"),
      );
      expect(criticalErrors).toHaveLength(0);
    });
  }
});
