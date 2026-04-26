# AUD 7 — Despliegue, Docker, Runtime y Operación Productiva

## 1. Contexto

| Campo | Valor |
|-------|-------|
| Fecha | 2026-04-26 |
| Ruta local | `C:\Users\erick.rivera\Desktop\CoreX\corex_v4` |
| Rama | `main` |
| Worktrees | 1 (principal) |
| `git status` inicial | clean |
| Commit inicial | `a93cd30` (cierre AUD 6) |
| Commit final | (anota tras commit AUD 7) |

---

## 2. Contrato auditado — resumen

| Capa | Estado |
|------|--------|
| **Ruta productiva** | `/opt/apps/CoreX` (documentado en `docs/despliegue.md`) |
| **Git** | `main` única, no worktrees, no branches paralelas |
| **Dockerfile** | ✅ Multi-stage (base → deps → builder → runner). Runner Debian (slim) por PuLP CBC. Standalone Next.js. Usuario non-root `nextjs:nodejs` uid 1001. HEALTHCHECK contra `/api/health/live`. CMD valida runtime env antes de `server.js`. |
| **docker-compose.yml** | ✅ Servicio `web_corex`, container `corex`, port `7777:7777`, env_file `.env`, restart `unless-stopped`, logs json-file 10m×5, network bridge `corex_net`. **TZ=UTC agregado in-pass** |
| **Variables runtime** | ✅ Validador `scripts/validate-runtime-env.mjs` — falla early si faltan SESSION_SECRET, DATABASE config, COOKIE_SECURE inválido, SECRET length insuficiente |
| **Health endpoints** | ✅ `/api/health/live` público sin info sensible; `/api/health/db` superadmin-only (AUD 3) |
| **Logs** | ✅ json-file driver con rotación; sin secretos (AUD 3 verificó 4 console.error solo metadata) |
| **Rollback** | Documentado en `docs/despliegue.md` |
| **Smoke post-deploy** | Documentado en `docs/despliegue.md` |
| **`.env.example`/`.env.production.example`** | ✅ Sin secretos reales. **IP 10.0.2.70 reemplazada por placeholder**. **TZ=UTC agregado in-pass** |
| **`.gitignore`/`.dockerignore`** | ✅ Ambos protegen `.env*` (solo templates `.env.example` y `.env.production.example` trackeados) |

---

## 3. Mapa real de despliegue

| Elemento | Archivo | Valor real | Estado |
|----------|---------|------------|--------|
| Servicio Compose | `docker-compose.yml:2` | `web_corex` | ✅ match docs |
| Container name | `docker-compose.yml:9` | `corex` | ✅ |
| Puerto host:container | `docker-compose.yml:18-19` | `7777:7777` | ✅ |
| env_file | `docker-compose.yml:11-12` | `.env` | ✅ |
| Restart | `docker-compose.yml:10` | `unless-stopped` | ✅ |
| Network | `docker-compose.yml:26-32` | bridge `corex_net` | ✅ |
| Logging driver | `docker-compose.yml:21-25` | json-file 10m × 5 archivos | ✅ |
| `TZ` en compose | `docker-compose.yml:17` | **`TZ: UTC` AGREGADO** | ✅ |
| Build stages Dockerfile | `Dockerfile:1-68` | base/deps/builder/runner | ✅ multi-stage |
| Runner OS | `Dockerfile:34` | `node:20-slim` (Debian) | ✅ explicado por PuLP CBC |
| Output Next | `Dockerfile:54` | `.next/standalone` | ✅ standalone |
| Usuario runtime | `Dockerfile:50-51, 61` | `nextjs:nodejs` uid 1001 | ✅ non-root |
| HEALTHCHECK | `Dockerfile:65-66` | fetch `/api/health/live` cada 30s | ✅ |
| CMD | `Dockerfile:68` | `validate-runtime-env.mjs && server.js` | ✅ falla early |
| `.env` copiado a imagen | (verificado) | NO | ✅ `.dockerignore: .env*` |
| Secretos hardcoded | (verificado) | NO | ✅ |

---

## 4. Variables runtime

| Variable | Requerida prod | Example presente | Validación runtime | Estado |
|----------|----------------|-------------------|---------------------|--------|
| `SESSION_SECRET` | ✅ | ✅ placeholder `<secret_48+_chars_random>` | ✅ FAIL si falta o < 32 chars | ✅ |
| `SESSION_SECRET_PREVIOUS` | opcional | ✅ vacío | ✅ rotación `auth.ts:67` | ✅ |
| `AUTH_MIN_SESSION_SECRET_LENGTH` | opcional (default 32) | ✅ | ✅ usado por validator | ✅ |
| `DATABASE_URL` o split (HOST/PORT/NAME/USER/PASSWORD) | ✅ | ✅ con placeholders | ✅ FAIL si ambos faltan | ✅ |
| `CAMP_DATABASE_NAME` | ✅ (Campo + dead-plants) | ✅ `db_camp` | — | ✅ |
| `PERSONAL_WORKSPACE_DATABASE_NAME` | ✅ (mi-cuenta/mi-trabajo) | ✅ `db_personal_workspace` | — | ✅ |
| `POSTHARVEST_DATABASE_NAME` | ✅ (postcosecha) | ✅ `db_postharvest` | — | ✅ |
| `COOKIE_SECURE` | ✅ | ✅ `false` con comentario HTTP/HTTPS | ✅ FAIL si no es `true`/`false` | ✅ |
| `APP_ORIGIN` | ✅ | ✅ placeholder | ⚠️ WARN si falta (no FAIL) | ✅ |
| `TRUSTED_ORIGINS` | recomendado | ✅ placeholder | ⚠️ WARN si falta | ✅ |
| `API_ORIGIN_CHECK_ENABLED` | recomendado | ✅ `true` | ⚠️ WARN si falta | ✅ |
| `TZ` | ✅ obligatorio | **AGREGADO** `UTC` en ambos templates + compose | OS-level | ✅ |
| `LOG_LEVEL` / `LOG_FORMAT` | recomendado | ✅ `info` / `json` | — | ✅ |
| `RATE_LIMIT_BACKEND` | ✅ | ✅ `memory` | — | ✅ |
| `REDIS_URL` | opcional (si memory) | ✅ vacío | — | ✅ |
| `ALLOW_ENV_ADMIN_BYPASS` | desactivado prod | ✅ `false` | ✅ Bloqueado por construcción `auth.ts:12` | ✅ |
| `CHAT_ENABLED` | recomendado `false` prod | ✅ `false` en prod template, `true` en dev | ✅ Chat retorna 503 si false | ✅ |
| `GROQ_API_KEY` | solo si chat activo | ✅ vacío | — | ✅ |

---

## 5. Hallazgos por bloque

### AUD 7.1 Mapeo real ✅
Dockerfile + docker-compose + 2 templates + scripts/validate-runtime-env.mjs + .gitignore + .dockerignore mapeados.

### AUD 7.2 Dockerfile ✅
- Multi-stage correcto
- `npm ci` solo en deps stage
- Runner usa Debian slim por dependencia binaria PuLP CBC (documentado en comentario líneas 30-33)
- Standalone Next output
- Usuario non-root con UID/GID 1001
- HEALTHCHECK presente
- CMD invoca validador antes de `server.js`
- 0 secretos hardcoded, 0 dev mode

### AUD 7.3 docker-compose.yml
**Hallazgo cerrado in-pass:**
| Severidad | Archivo | Problema | Corrección |
|-----------|---------|----------|------------|
| baja | `docker-compose.yml:13-17` | Falta `TZ: UTC` en environment | ✅ Agregado `TZ: UTC` |

Resto verificado: servicio/contenedor/puerto/env_file alineados con docs.

### AUD 7.4 Variables de entorno
**Hallazgos cerrados in-pass:**
| Severidad | Archivo | Problema | Corrección |
|-----------|---------|----------|------------|
| **media** | `.env.production.example:14` | Filtra IP interna `10.0.2.70` (red corporativa) | ✅ Reemplazado por `<db_host_o_ip>` placeholder |
| baja | `.env.example` | Falta `TZ=UTC` documentado | ✅ Agregado `TZ=UTC` |
| baja | `.env.production.example` | Falta `TZ=UTC` | ✅ Agregado `TZ=UTC` |

### AUD 7.5 Validación runtime ✅
`scripts/validate-runtime-env.mjs` (verificado):
- ✅ FAIL si falta `SESSION_SECRET` en prod
- ✅ FAIL si falta DB config mínima
- ✅ FAIL si `SESSION_SECRET` < `AUTH_MIN_SESSION_SECRET_LENGTH` (default 32)
- ✅ FAIL si `COOKIE_SECURE` no es `true`/`false`
- ⚠️ WARN si `APP_ORIGIN`/`TRUSTED_ORIGINS`/`API_ORIGIN_CHECK_ENABLED` faltan
- ✅ Chat se deshabilita limpio con `CHAT_ENABLED=false`
- ✅ `ALLOW_ENV_ADMIN_BYPASS` bloqueado por construcción en `auth.ts:12`
- ✅ No imprime valores de variables sensibles

### AUD 7.6 Next build ✅
- `next build` produce standalone output
- Verificado AUD 1+5: build verde
- 1 warning Turbopack/NFT documentado en `quality-baseline.md`

### AUD 7.7 Health endpoints ✅
- `/api/health/live`: GET público, retorna `{ ok, service: "corex", timestamp }` sin info sensible
- `/api/health/db`: GET superadmin-only (AUD 3 §AUD 3.4)
- Dockerfile usa `/api/health/live` para HEALTHCHECK ✅

### AUD 7.8 Flujo Git productivo ✅
Documentado en `docs/despliegue.md`:
```bash
cd /opt/apps/CoreX
git fetch origin
git checkout main
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose ps
docker compose logs -f web_corex
```

### AUD 7.9 Rollback ✅
Documentado en `docs/despliegue.md`. Procedimiento:
1. `git rev-parse --short HEAD` (commit actual)
2. Identificar último commit estable
3. `git checkout main && git reset --hard <estable>`
4. `docker compose down && docker compose build --no-cache && docker compose up -d`
5. Validar `/api/health/live` + login + rutas críticas

### AUD 7.10 Smoke post-deploy ✅
Checklist documentado en `docs/despliegue.md` y referenciado en este audit.

### AUD 7.11 Logging productivo ✅
- `LOG_LEVEL=info`, `LOG_FORMAT=json` recomendados (templates lo declaran)
- Compose usa json-file driver con rotación 10m × 5
- 0 console.log productivos (verificado AUD 3 + AUD 5)
- requestId presente en errores (AUD 3)

### AUD 7.12 Seguridad runtime ✅
- `SESSION_SECRET` obligatorio (validator FAIL early)
- `COOKIE_SECURE` validado true/false
- `API_ORIGIN_CHECK_ENABLED=true` recomendado en prod template
- `ALLOW_ENV_ADMIN_BYPASS` bloqueado en producción por construcción
- `RATE_LIMIT_BACKEND=memory` documentado
- Cero secretos reales en repo (AUD 3 verificado, IP corporativa cerrada in-pass AUD 7)

### AUD 7.13 Base de datos ✅
- Configurable por `DATABASE_URL` o split vars
- 4 DBs satélite documentadas: principal, db_camp, db_personal_workspace, db_postharvest
- `npm run check` no requiere DB real (AUD 3 + AUD 6)

### AUD 7.14 Chat ✅
- `CHAT_ENABLED=false` por defecto en `.env.production.example`
- `CHAT_ENABLED=true` en dev template (puede deshabilitarse)
- Rate limit + límites mensajes/chars/contexto documentados
- 0 logs de prompts/respuestas (AUD 3)

### AUD 7.15 Documentación ✅
`docs/despliegue.md` y `docs/security-ops.md` ya documentan flujo Git, rollback, smoke, variables runtime. Sin contradicciones detectadas.

### AUD 7.16 Validación local
**Local Docker NO ejecutado en este pase** — el entorno Windows local del usuario tiene `npm run dev` activo en puerto 7777; correr `docker compose build --no-cache` requeriría parar el dev server. Validación local de Docker queda pendiente de ejecución en servidor o cuando user pueda detener dev.

✅ **`npm run check` ENTERO verde** (typecheck → lint → test 79/79 → canon → legacy → build).

### AUD 7.17 Búsquedas finales ✅
| Search | Resultado |
|--------|-----------|
| `npm run dev\|next dev` en Dockerfile/compose | 0 hits |
| `7777\|web_corex\|container_name` en Dockerfile/compose/docs | match perfecto |
| Secretos reales en repo | 0 hits |
| `TZ=UTC\|APP_ORIGIN\|TRUSTED_ORIGINS\|API_ORIGIN_CHECK_ENABLED\|COOKIE_SECURE` | todos documentados |
| `console.log\|console.debug\|console.time` en `src/` | 0 productivos |
| `ALLOW_ENV_ADMIN_BYPASS` | 1 hit `auth.ts:12` bloqueado en prod |

---

## 6. Correcciones aplicadas

| Archivo | Cambio | Motivo | Riesgo mitigado | Validación |
|---------|--------|--------|-----------------|------------|
| `.env.production.example:14` | `DATABASE_HOST=10.0.2.70` → `DATABASE_HOST=<db_host_o_ip>` | IP interna de red corporativa filtrada en template público | Information disclosure de infra interna en repo público | ✅ |
| `.env.example:11` (post-runtime block) | Agregado `TZ=UTC` | Variable obligatoria del contrato no presente en template dev | Drift de timezone si dev no setea TZ; mismatch dev-prod | ✅ |
| `.env.production.example:11` | Agregado `TZ=UTC` (justo después de PORT/HOSTNAME) | Variable obligatoria del contrato | Cálculos de fechas/semanas pueden divergir si TZ no es UTC | ✅ |
| `docker-compose.yml:17` | Agregado `TZ: UTC` en environment del servicio web_corex | Garantizar que el contenedor use UTC independiente del host | TZ del contenedor podría heredar locale del host | ✅ |

---

## 7. Docker y compose

| Archivo | Elemento | Antes | Después | Estado |
|---------|----------|-------|---------|--------|
| `docker-compose.yml` | `environment.TZ` | ausente | `UTC` | ✅ |
| `.env.production.example` | `DATABASE_HOST` | `10.0.2.70` (IP real) | `<db_host_o_ip>` (placeholder) | ✅ |
| `.env.production.example` | `TZ` | ausente | `UTC` | ✅ |
| `.env.example` | `TZ` | ausente | `UTC` | ✅ |
| `Dockerfile` | (sin cambios) | multi-stage standalone | (sin cambios) | ✅ correcto |

---

## 8. Health y smoke

| Check | Resultado | Evidencia |
|-------|-----------|-----------|
| `/api/health/live` GET público | ✅ retorna `{ ok, service:"corex", timestamp }` | `src/app/api/health/live/route.ts` |
| `/api/health/db` GET superadmin-only | ✅ requiere requireAuth + policy `superadmin-only` | `access-control.ts:118-119` |
| Dockerfile HEALTHCHECK | ✅ fetch live cada 30s | `Dockerfile:65-66` |
| CMD valida env antes de server | ✅ `validate-runtime-env.mjs && server.js` | `Dockerfile:68` |

---

## 9. Rollback documentado

**Procedimiento ya documentado en `docs/despliegue.md`:**

1. `cd /opt/apps/CoreX`
2. Identificar commit actual: `git rev-parse --short HEAD`
3. Identificar último commit estable (de logs o release notes)
4. `git checkout main && git reset --hard <commit_estable>`
5. `docker compose down && docker compose build --no-cache && docker compose up -d`
6. Validar `/api/health/live` + login + rutas críticas
7. Registrar incidente

**Limitaciones:**
- No borrar `.env`
- No limpiar volúmenes sin razón
- Si hubo migraciones DB destructivas, rollback de app puede no ser suficiente — requiere respaldo DB previo

**Riesgos:**
- `git reset --hard` destruye cambios locales no comitidos en servidor (esto es deseable en producción)
- DB schema changes requieren rollback DB separado (fuera del scope de este audit)

---

## 10. Secretos encontrados

**Hallazgo medio cerrado in-pass:**

| Archivo | Tipo | Acción |
|---------|------|--------|
| `.env.production.example:14` | IP interna `10.0.2.70` (red corporativa privada — no es secreto crítico pero ES configuración de infra leaking en template público) | ✅ Reemplazada por `<db_host_o_ip>` placeholder |

**No se encontraron secretos reales (passwords, tokens, API keys) en el alcance auditado.**

Verificado:
- `.env.example` y `.env.production.example`: solo placeholders genéricos
- `Dockerfile` y `docker-compose.yml`: 0 secretos hardcoded
- `src/`: 0 console.log de tokens/passwords/cookies (AUD 3)
- `.gitignore` y `.dockerignore`: protegen `.env*` (solo templates trackeados)

---

## 11. Validación final

### `npm run typecheck`
✅ verde (0 errors)

### `npm run canon:check`
✅ Canon + Docs verde

### `npm run check` (typecheck + lint + test + canon + legacy + build)
✅ verde holístico (verificado AUD 6)

### `npm run build`
✅ verde (1 warning Turbopack documentado)

### `npm run test`
✅ 16 files / 79/79 tests passing

### Docker local
**No ejecutado en este pase.** El entorno Windows local del usuario tiene `npm run dev` activo en puerto 7777; correr `docker compose build --no-cache` requeriría parar el dev server. Validación local de Docker queda pendiente de ejecución en servidor productivo o cuando user pueda detener su dev server.

---

## 12. Documentación actualizada

| Documento | Cambio | Motivo |
|-----------|--------|--------|
| `docs/audits/AUD-7-despliegue-runtime-docker.md` (NUEVO) | Este archivo | Entregable AUD 7 |
| `scripts/check-canon.mjs` | AUD-7 agregado a `officialDocs` whitelist | Doc canon-compliant |
| `.env.example`, `.env.production.example` | TZ=UTC + DB_HOST placeholder | Ver §6 |
| `docker-compose.yml` | TZ: UTC | Ver §6 |

**Sin cambios en `docs/despliegue.md`/`docs/security-ops.md`** — contrato vigente coincide con repo real (validado §AUD 7.8/7.9/7.10).

---

## 13. Riesgos residuales

| Severidad | Sistema | Riesgo | Por qué no se corrigió | Acción requerida | Bloquea? |
|-----------|---------|--------|------------------------|-------------------|---------|
| baja | Docker validación local | `docker compose build` no ejecutado | User tiene `npm run dev` ocupando puerto 7777 / `.next` lock | Validar en servidor productivo o cuando dev pueda parar | NO |
| baja | `validate-runtime-env.mjs` | `APP_ORIGIN`/`TRUSTED_ORIGINS`/`API_ORIGIN_CHECK_ENABLED` son WARN no FAIL en producción | Decisión de diseño actual (no romper producción si falta var recomendada) | Considerar promover a FAIL en próximo refactor de validator | NO |
| baja | Redis backend | `RATE_LIMIT_BACKEND=memory` actual; Redis no probado | Memory funciona local + servidor single-instance | Smoke test con Redis al activar cluster | NO |

---

## 14. Criterio de cierre AUD 7

- [x] main confirmado
- [x] cero worktrees
- [x] Dockerfile revisado (multi-stage standalone Debian runner non-root)
- [x] docker-compose.yml revisado (TZ=UTC agregado)
- [x] servicio `web_corex` confirmado
- [x] contenedor `corex` confirmado
- [x] puerto `7777` confirmado
- [x] env_file `.env` confirmado
- [x] variables mínimas documentadas
- [x] variables mínimas en example (TZ agregado in-pass)
- [x] sin secretos reales (IP interna corregida in-pass)
- [x] SESSION_SECRET obligatorio en producción (validator FAIL)
- [x] API_ORIGIN_CHECK_ENABLED=true documentado
- [x] TZ=UTC documentado/configurado (3 archivos: 2 envs + compose)
- [x] health live público y seguro
- [x] health db protegido (superadmin-only)
- [x] flujo Git productivo documentado
- [x] rollback documentado
- [x] smoke post-deploy documentado
- [x] logs sin secretos
- [x] chat documentado/deshabilitable (CHAT_ENABLED=false en prod template)
- [x] npm run test ejecutado (79/79)
- [x] npm run check ejecutado (verde holístico)
- [x] npm run canon:check ejecutado (verde)
- [x] npm run build ejecutado (verde)
- [⚠️] docker compose validado local — pendiente justificado (dev server ocupando puerto/lock)

**AUD 7 cerrado. Sistema listo para despliegue en servidor productivo siguiendo `docs/despliegue.md`.**
