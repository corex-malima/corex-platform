#!/bin/bash
# Cron wrapper para refrescar las materialized views de productividad de
# postcosecha. Se ejecuta una vez al día desde el server de produccion.
#
# Configurado para correr a las 06:00 hora Ecuador (UTC-5).
# Si el server esta en UTC: cron a las 11:00 UTC.
# Si el server esta en hora Ecuador: cron a las 06:00 local.
#
# Instalacion:
#   chmod +x /opt/apps/CoreX/scripts/cron-refresh-postharvest-productivity.sh
#   crontab -e
#   (agregar la entry correspondiente — ver README en CLAUDE.md)
#
# Logs: /var/log/corex/postharvest-productivity-refresh.log
# Lock file: /tmp/corex-postharvest-refresh.lock (evita corridas concurrentes)

set -euo pipefail

REPO_DIR="/opt/apps/CoreX"
LOG_DIR="/var/log/corex"
LOG_FILE="${LOG_DIR}/postharvest-productivity-refresh.log"
LOCK_FILE="/tmp/corex-postharvest-refresh.lock"
NODE_BIN="$(command -v node || echo /usr/bin/node)"

# Crear log dir si no existe (con fallback a /tmp si no hay permisos)
if ! mkdir -p "${LOG_DIR}" 2>/dev/null; then
  LOG_DIR="/tmp"
  LOG_FILE="/tmp/corex-postharvest-productivity-refresh.log"
fi

# Lock para evitar corridas concurrentes (si la corrida anterior aun no termino)
exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "[$(date -Iseconds)] SKIP: otra corrida aun esta activa (lock: ${LOCK_FILE})" >> "${LOG_FILE}"
  exit 0
fi

cd "${REPO_DIR}"

# Cargar .env como variables de entorno
if [ ! -f .env ]; then
  echo "[$(date -Iseconds)] ERROR: .env no existe en ${REPO_DIR}" >> "${LOG_FILE}"
  exit 1
fi

set -a
# shellcheck disable=SC1091
. ./.env
set +a

{
  echo ""
  echo "==================================================================="
  echo "[$(date -Iseconds)] START postharvest productivity refresh"
  echo "==================================================================="

  "${NODE_BIN}" scripts/apply-postharvest-productivity-sql.mjs
  EXIT_CODE=$?

  echo "[$(date -Iseconds)] FINISH (exit=${EXIT_CODE})"
} >> "${LOG_FILE}" 2>&1

exit "${EXIT_CODE:-0}"
