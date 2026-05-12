# Despliegue

Guia viva para despliegue manual de CoreX con Docker Compose.

## Stack actual

- Next.js 16
- Docker multi-stage
- `docker-compose.yml`
- servicio `web_corex`
- contenedor `corex`
- puerto expuesto `7777`
- `env_file: .env`

## Flujo canonico de actualizacion

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

## Si el servidor tiene cambios locales

Usar esto solo si esos cambios NO deben conservarse:

```bash
cd /opt/apps/CoreX

git restore .
git clean -fd
git pull origin main
```

## Variables runtime minimas

La app valida runtime antes de arrancar `server.js`.

Configurar al menos:

### Base de datos

Opcion A:

```env
DATABASE_URL=postgresql://usuario:clave@host:5432/base
```

Opcion B:

```env
DATABASE_HOST=host
DATABASE_PORT=5432
DATABASE_NAME=base
CAMP_DATABASE_NAME=db_camp
PERSONAL_WORKSPACE_DATABASE_NAME=db_personal_workspace
DATABASE_USER=usuario
DATABASE_PASSWORD=clave
```

`CAMP_DATABASE_NAME` es requerido para el modulo operativo `/dashboard/dead-plants-reseed`, que escribe en `db_camp.public.camp_fact_dead_plants_cur` y `db_camp.public.camp_fact_reseed_plants_cur`.

`PERSONAL_WORKSPACE_DATABASE_URL` o `PERSONAL_WORKSPACE_DATABASE_NAME=db_personal_workspace` es requerido para `/dashboard/mi-cuenta` y `/dashboard/mi-trabajo`. La app no crea auth paralelo; solo persiste perfil, preferencias, espacios, tareas, eventos y recordatorios del usuario autenticado.

Antes de habilitar esos modulos en servidor, aplicar manualmente:

```bash
psql "$PERSONAL_WORKSPACE_DATABASE_URL" -f sql/db_personal_workspace.sql
```

Si se usa configuracion separada por host/usuario en vez de URL, aplicar el SQL contra la base `db_personal_workspace` con las mismas credenciales configuradas para la app.

`HUMAN_TALENT_DATABASE_URL` o `HUMAN_TALENT_DATABASE_NAME=db_human_talent` es requerido para `/dashboard/talento-humano/seguimientos` (Seguimientos Trabajo Social). El modulo carga con selectores vacios si la BD no esta disponible (degradacion graceful), pero registrar respuestas falla hasta que el SQL se aplique.

`COMMERCIAL_DATABASE_NAME=db_commercial` es requerido para los maestros de `Comercial` y para el modulo transaccional `Gestion / Comercial / Reclamos`.

`COMMERCIAL_CLAIMS_NAS_ROOT` es requerido para guardar y servir fotos de reclamos comerciales.

Ruta NAS actual esperada:

```env
COMMERCIAL_CLAIMS_NAS_ROOT=\\10.0.2.15\06_transformacion\Vigentes\PROYECTOS\PLANIFICACION\lakehouse\data\nosql\comercial\img
```

Antes de habilitar ese modulo, aplicar manualmente en `db_human_talent`:

```bash
# Con URL:
HUMAN_TALENT_DATABASE_URL=postgresql://user:pass@10.0.2.70:5432/db_human_talent \
  node scripts/apply-human-talent-sql.mjs

# O con variables split ya en .env (usa DATABASE_HOST/PORT/USER/PASSWORD + HUMAN_TALENT_DATABASE_NAME):
node scripts/apply-human-talent-sql.mjs
```

El script aplica `sql/db_human_talent.sql` (idempotente), incluyendo el seed base de `agr_followup_frequency` con `T1..T5` segun los valores reales de `gld.mv_tthh_asgn_followup_scd2.follow_up_type` (ver `docs/datos.md`).

### Seguridad y sesion

```env
SESSION_SECRET=replace_with_a_long_random_secret
COOKIE_SECURE=false
APP_ORIGIN=http://tu-host-o-dominio:7777
TRUSTED_ORIGINS=http://tu-host-o-dominio:7777
API_ORIGIN_CHECK_ENABLED=true
TZ=UTC
```

## Comercial / Reclamos - requisito de servidor

Para el modulo `Gestion / Comercial / Reclamos`, las fotos no deben depender del usuario final que abre la app.

Regla de despliegue obligatoria:

1. CoreX debe correr en un servidor central, no como `localhost` de cada usuario final.
2. El proceso `Next.js` / `node` debe ejecutarse con una cuenta de servicio de dominio.
3. Solo esa cuenta de servicio debe tener permisos sobre `COMMERCIAL_CLAIMS_NAS_ROOT`.
4. Los usuarios funcionales y aprobadores no requieren permisos directos al NAS.
5. La visualizacion de fotos debe ocurrir exclusivamente por la API:
   - `POST /api/comercial/reclamos/[claimId]/photo`
   - `GET /api/comercial/reclamos/[claimId]/attachments/[attachmentId]`

Recomendacion operativa:

- cuenta sugerida: `GRUPO-MALIMA\\svc_corex`
- permisos minimos en la carpeta NAS: `Read`, `Write`, `Modify`
- no otorgar permisos amplios del share a todos los usuarios del modulo

Si CoreX se ejecuta localmente en la PC del usuario, la API seguira leyendo/escribiendo con esa cuenta Windows local y no con una cuenta tecnica central.

`TZ=UTC` es obligatorio en servidor y contenedor para evitar drift de fechas tipo `YYYY-MM-DD` y errores off-by-one al normalizar fechas de BD.

### Mount del NAS para fotos de reclamos (Linux + Docker)

> **Por qué hace falta declararlo en docker-compose**: aunque el NAS
> esté montado en el host Linux, Docker aísla el filesystem del
> container por defecto. Sin bind mount, dentro del container la ruta
> simplemente no existe y los uploads de fotos fallan con `ENOENT`. El
> `docker-compose.yml` del repo ya trae el bind mount + la env var.

#### Setup real en producción (srvproduccion, 10.0.2.70)

En este servidor el share SMB del NAS ya está montado en el host vía
**autofs** (`x-systemd.automount`, on-demand) en
`/srv/postgres/nas_planificacion`. Output de `mount | grep cifs`:

```
//10.0.2.15/06_transformacion/Vigentes/PROYECTOS/PLANIFICACION on
  /srv/postgres/nas_planificacion type cifs
  (rw, vers=3.0, uid=1000, gid=1000, dir_mode=0775, noperm, ...)
```

El container Node corre como uid/gid **1001** (`nextjs`, ver
`Dockerfile`). En el host ese uid pertenece al usuario `developer`. El
mount está montado con uid/gid 1000 pero el flag `noperm` + `dir_mode=0775`
permite que el grupo escriba; verificado que uid 1001 puede touch/rm
archivos en `/srv/postgres/nas_planificacion/.../comercial/img`.

El `docker-compose.yml` del repo expone esa ruta como
`/mnt/nas_planificacion` adentro del container con
`propagation: rshared` (esencial porque el mount del host es autofs y
puede activarse/desactivarse on-demand).

**El usuario final del navegador no toca el NAS ni necesita credenciales
SMB** — la sesión SMB la abre el host con la cuenta que configuraste en
la unidad autofs.

#### Pasos en el servidor (una vez por deploy / rebuild)

1. Confirmar que el mount está activo y la subcarpeta existe:

   ```bash
   ls /srv/postgres/nas_planificacion/lakehouse/data/nosql/comercial/img
   ```

   Si el directorio responde (puede estar vacío), autofs está activo. Si
   da `ENOENT`, el mount está caído — investigar con
   `systemctl status srv-postgres-nas_planificacion.automount` y
   `mount -a`.

2. Verificar que el container puede escribir (simular con uid 1001):

   ```bash
   sudo -u "#1001" touch /srv/postgres/nas_planificacion/lakehouse/data/nosql/comercial/img/_corex_write_test
   sudo -u "#1001" rm /srv/postgres/nas_planificacion/lakehouse/data/nosql/comercial/img/_corex_write_test
   ```

3. Asegurar la env var en el `.env` del servidor (al lado de
   `docker-compose.yml`). El compose ya define un default, pero queda
   más explícito:

   ```bash
   grep COMMERCIAL_CLAIMS_NAS_ROOT .env || \
     echo 'COMMERCIAL_CLAIMS_NAS_ROOT=/mnt/nas_planificacion/lakehouse/data/nosql/comercial/img' >> .env
   ```

4. Pull del código y rebuild:

   ```bash
   git pull origin main
   docker compose down
   docker compose up -d --build
   ```

5. Validar bind mount adentro del container:

   ```bash
   # Ver la config efectiva
   docker compose config | grep -A4 -E "(NAS|nas_planificacion)"

   # Listar adentro del container — debe mostrar lo mismo que en el host
   docker compose exec web_corex ls /mnt/nas_planificacion/lakehouse/data/nosql/comercial/img

   # uid/gid efectivos del proceso Node
   docker compose exec web_corex id
   # Esperado: uid=1001(nextjs) gid=1001(nodejs)
   ```

6. Logs de validación de entorno:

   ```bash
   docker compose logs web_corex | grep -iE "ENV|NAS|configuracion"
   ```

   - `[ENV] Configuracion runtime validada.` → ✓
   - `[ENV] COMMERCIAL_CLAIMS_NAS_ROOT no esta definido. ...` → falta la env, revisa `.env`.

7. Smoke test desde el navegador:
   1. Login como superadmin.
   2. Gestión → Comercial → Reclamos → crear reclamo de prueba con foto.
   3. Volver a la ficha del reclamo, la foto debe verse.
   4. Desde el host:
      ```bash
      ls /srv/postgres/nas_planificacion/lakehouse/data/nosql/comercial/img/$(date +%Y)/$(date +%m)/$(date +%d)/
      ```
      Debe aparecer la carpeta del reclamo con el `.webp` recién subido.

#### Troubleshooting

- **`EACCES` al subir fotos**: la sesión SMB del autofs perdió permisos
  (la cuenta usada cambió password). Revisar con `mount | grep cifs` que
  el `username=` siga válido. Reiniciar el automount si hace falta:
  `sudo systemctl restart srv-postgres-nas_planificacion.automount`.
- **`ENOENT` al subir fotos**: la subcarpeta `comercial/img` se borró en
  el NAS, o el autofs no disparó. Forzar acceso (`ls /srv/postgres/nas_planificacion/...`)
  y luego `docker compose restart web_corex`.
- **`ls` adentro del container muestra carpeta vacía pero en el host
  tiene archivos**: el autofs se reactivó después de levantar el
  container. Con `propagation: rshared` esto NO debería pasar — pero si
  ocurre, `docker compose restart web_corex` lo arregla. Considerar
  convertir el mount a fijo en `/etc/fstab` si el problema persiste.
- **Container arranca pero la primera foto falla con 500**: revisar
  `docker compose logs web_corex` para el error real. Si dice
  "Configura COMMERCIAL_CLAIMS_NAS_ROOT...", la env no llegó. Si dice
  "ENOENT" o "EACCES", problema de mount/permisos.
- **Falló el autofs al reiniciar el host**: con `x-systemd.automount` el
  mount se activa on-demand al primer acceso; si la sesión SMB falla
  hay que mirar `journalctl -u srv-postgres-nas_planificacion.automount`
  y `dmesg | tail | grep -i cifs`.

#### Alternativa: cuenta de servicio de dominio (recomendado para prod estable)

Hoy el autofs usa la cuenta personal `erick.rivera@GRUPO-MALIMA.CORE`.
Para producción estable, migrar a una cuenta de servicio
(`svc_corex@GRUPO-MALIMA.CORE`) que no expire ni cambie password al
ritmo de los humanos. Esto es deuda registrada en
`CLAUDE.md` (sección _Reclamos / Frente Comercial_).

### Logging y rate limit

```env
LOG_LEVEL=info
LOG_FORMAT=json
RATE_LIMIT_BACKEND=memory
REDIS_URL=
```

## Archivos de entorno

- local del desarrollador: `.env.local`
- servidor Docker actual: `.env`
- plantillas: `.env.example`, `.env.production.example`

Regla:

- no sobrescribir secretos reales con las plantillas
- revisar plantillas cuando haya cambios en auth, origin, cookies, Docker o build
- copiar solo variables nuevas requeridas

## Validacion antes de desplegar

```bash
npm run typecheck
npm run lint
npm run build
```

Si alguno falla, no desplegar.

## Health y observabilidad minima

- `/api/health/live`: publico, usado para healthcheck
- `/api/health/db`: protegido, solo `superadmin`

Comandos utiles:

```bash
docker compose ps
docker compose logs -f web_corex
docker compose restart web_corex
docker compose down
```

## Troubleshooting rapido

### La app levanta pero login falla

Revisar:

- `SESSION_SECRET`
- `APP_ORIGIN`
- `TRUSTED_ORIGINS`
- `COOKIE_SECURE`
- `API_ORIGIN_CHECK_ENABLED`
- logs de `web_corex`

### La base falla

Revisar:

- conectividad al host PostgreSQL
- credenciales DB
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `/api/health/db`

### El contenedor builda pero no arranca bien

Revisar:

- que `.env` exista en servidor
- que `SESSION_SECRET` no este vacio
- que `PORT=7777` y `HOSTNAME=0.0.0.0` se mantengan coherentes

### Rutas cargan en localhost pero fallan por IP HTTP

Si una pantalla cliente funciona en `localhost` pero falla en `http://<ip>`, revisar usos directos de APIs web que requieren contexto seguro. Caso real: `crypto.randomUUID()` no esta garantizado fuera de HTTPS/localhost y puede tumbar la hidratacion con "This page couldn't load". En componentes cliente usar `makeClientId()` de `src/shared/lib/client-id.ts`.

## Regla operativa

El deploy real del servidor hoy se gobierna por este documento, `docker-compose.yml` y el codigo. Si cambian nombres de servicio, puertos o variables runtime, este archivo debe actualizarse en el mismo lote.
