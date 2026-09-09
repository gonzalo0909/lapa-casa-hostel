#!/usr/bin/env bash
# lapa-casa-hostel/scripts/deploy.sh
#
# Dispara un deploy forzado en Vercel via Deploy Hook.
# Vercel ya hace auto-deploy en cada push a la rama conectada
# (`definitivo2026`) — este script es para forzar un redeploy sin
# pushear nada nuevo (ej. después de cambiar una variable de entorno
# en el dashboard) o para integrarlo en un pipeline de CI propio.
#
# Backend/worker corren en Fly.io (ver backend/fly.toml) y tienen su
# propio Auto-Deploy on push — no hay Deploy Hook equivalente que disparar
# desde acá; para el backend hacer push a la rama o usar el dashboard de Fly.
#
# Uso:
#   VERCEL_DEPLOY_HOOK_FRONTEND=https://api.vercel.com/v1/integrations/deploy/xxx/yyy \
#     ./scripts/deploy.sh frontend
#
#   VERCEL_DEPLOY_HOOK_LANDING=https://api.vercel.com/v1/integrations/deploy/aaa/bbb \
#     ./scripts/deploy.sh landing
#
# El Deploy Hook URL se genera en el dashboard de Vercel:
# Proyecto → Settings → Git → Deploy Hooks → Add. Es secreto — no
# commitear el valor real, pasarlo siempre por variable de entorno.

set -euo pipefail

TARGET="${1:-}"

if [[ "$TARGET" != "frontend" && "$TARGET" != "landing" ]]; then
  echo "Uso: $0 <frontend|landing>  (backend/worker están en Fly.io, no en Vercel)" >&2
  exit 1
fi

if [[ "$TARGET" == "frontend" ]]; then
  HOOK_URL="${VERCEL_DEPLOY_HOOK_FRONTEND:-}"
else
  HOOK_URL="${VERCEL_DEPLOY_HOOK_LANDING:-}"
fi

if [[ -z "$HOOK_URL" ]]; then
  echo "Falta la variable de entorno con el Deploy Hook de '$TARGET'." >&2
  echo "Ver docs/DEPLOY.md sección 4 para cómo generarla en el dashboard de Vercel." >&2
  exit 1
fi

echo "Disparando deploy de '$TARGET' en Vercel..."
HTTP_STATUS=$(curl -sS -o /tmp/vercel-deploy-response.json -w "%{http_code}" -X POST "$HOOK_URL")

if [[ "$HTTP_STATUS" -ge 200 && "$HTTP_STATUS" -lt 300 ]]; then
  echo "Deploy disparado correctamente (HTTP $HTTP_STATUS)."
  cat /tmp/vercel-deploy-response.json
  echo
  echo "Seguir el progreso en el dashboard de Vercel (Deployments) o via ./scripts/health-check.sh una vez termine."
else
  echo "Error disparando el deploy (HTTP $HTTP_STATUS):" >&2
  cat /tmp/vercel-deploy-response.json >&2
  exit 1
fi
