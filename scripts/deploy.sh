#!/usr/bin/env bash
# lapa-casa-hostel/scripts/deploy.sh
# ventana6
#
# Dispara un deploy en Render via Deploy Hook. Render ya hace autoDeploy
# en cada push a la rama conectada (ver render.yaml, autoDeploy: true) --
# este script es para forzar un redeploy sin pushear nada nuevo (ej.
# despues de cambiar una variable de entorno en el dashboard) o para
# integrarlo en un pipeline de CI propio.
#
# Backend/worker ya NO estan en Render (se mudaron a Fly.io, 2026-09-02) --
# este script solo cubre landing/frontend. Fly tiene su propio Auto-Deploy
# on push conectado a GitHub (ver backend/fly.toml y el dashboard de Fly,
# Settings -> Deploy branch); no hay Deploy Hook equivalente que disparar
# desde aca.
#
# Uso:
#   RENDER_DEPLOY_HOOK_LANDING=https://api.render.com/deploy/srv-zzz?key=www \
#     ./scripts/deploy.sh landing
#
#   RENDER_DEPLOY_HOOK_FRONTEND=https://api.render.com/deploy/srv-www?key=vvv \
#     ./scripts/deploy.sh frontend
#
# El Deploy Hook URL se genera en el dashboard de Render:
# Servicio -> Settings -> Deploy Hook. Es secreto -- no commitear el
# valor real, pasarlo siempre por variable de entorno.

set -euo pipefail

TARGET="${1:-}"

if [[ "$TARGET" != "landing" && "$TARGET" != "frontend" ]]; then
  echo "Uso: $0 <landing|frontend>  (backend/worker estan en Fly.io, no en Render)" >&2
  exit 1
fi

if [[ "$TARGET" == "landing" ]]; then
  HOOK_URL="${RENDER_DEPLOY_HOOK_LANDING:-}"
else
  HOOK_URL="${RENDER_DEPLOY_HOOK_FRONTEND:-}"
fi

if [[ -z "$HOOK_URL" ]]; then
  echo "Falta la variable de entorno con el Deploy Hook de '$TARGET' (ver docs/DEPLOY.md)." >&2
  exit 1
fi

echo "Disparando deploy de '$TARGET' en Render..."
HTTP_STATUS=$(curl -sS -o /tmp/render-deploy-response.json -w "%{http_code}" -X POST "$HOOK_URL")

if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
  echo "Deploy disparado correctamente (HTTP $HTTP_STATUS)."
  cat /tmp/render-deploy-response.json
  echo
  echo "Seguir el progreso en el dashboard de Render (Deploys) o via GET /health una vez termine."
else
  echo "Error disparando el deploy (HTTP $HTTP_STATUS):" >&2
  cat /tmp/render-deploy-response.json >&2
  exit 1
fi
