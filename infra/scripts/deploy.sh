#!/usr/bin/env bash
# ============================================================
#  Déploie une version (tag d'image GHCR) sur le VPS, avec rollback
#  automatique si les conteneurs ne deviennent pas sains.
#  Lancé par GitHub Actions (utilisateur deploy-essadrati) ou à la main :
#    /opt/essadrati/infra/scripts/deploy.sh <tag>      déploie <tag>
#    /opt/essadrati/infra/scripts/deploy.sh --rollback revient au tag précédent
#  Le tag courant est IMAGE_TAG dans /opt/essadrati/.env.prod ; le précédent
#  est gardé dans /opt/essadrati/.previous-tag.
# ============================================================
set -euo pipefail

APP_DIR="/opt/essadrati"
ENV_FILE="${APP_DIR}/.env.prod"
PREVIOUS_FILE="${APP_DIR}/.previous-tag"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-240}"

cd "$APP_DIR"
compose() { docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml "$@"; }
current_tag() { grep -E '^IMAGE_TAG=' "$ENV_FILE" | cut -d= -f2; }
set_tag() { sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$1/" "$ENV_FILE"; }

# Waits until backend and storefront report "healthy".
wait_healthy() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT)) service id status ok
  while [ "$SECONDS" -lt "$deadline" ]; do
    ok=1
    for service in backend storefront; do
      id="$(compose ps -q "$service")"
      status="$( [ -n "$id" ] && docker inspect -f '{{.State.Health.Status}}' "$id" 2>/dev/null || echo missing)"
      [ "$status" = "healthy" ] || ok=0
    done
    [ "$ok" -eq 1 ] && return 0
    sleep 5
  done
  return 1
}

if [ "${1:-}" = "--rollback" ]; then
  [ -s "$PREVIOUS_FILE" ] || { echo "aucun tag précédent" >&2; exit 1; }
  TARGET="$(cat "$PREVIOUS_FILE")"
  echo "[deploy] rollback vers ${TARGET}"
  set_tag "$TARGET"
  compose up -d --remove-orphans
  wait_healthy && echo "[deploy] rollback OK" || { echo "[deploy] rollback non sain" >&2; exit 1; }
  exit 0
fi

TARGET="${1:?usage: deploy.sh <tag> | --rollback}"
[[ "$TARGET" =~ ^[A-Za-z0-9._-]{1,128}$ ]] || { echo "tag invalide" >&2; exit 2; }
PREVIOUS="$(current_tag)"

echo "[deploy] ${PREVIOUS:-aucun} -> ${TARGET}"
set_tag "$TARGET"
if ! compose pull backend storefront; then
  set_tag "$PREVIOUS"
  echo "[deploy] échec du pull, version inchangée" >&2
  exit 1
fi
compose up -d --remove-orphans

if wait_healthy; then
  [ -n "$PREVIOUS" ] && [ "$PREVIOUS" != "$TARGET" ] && echo "$PREVIOUS" > "$PREVIOUS_FILE"
  echo "[deploy] ${TARGET} en ligne"
  exit 0
fi

echo "[deploy] ${TARGET} non sain : rollback vers ${PREVIOUS}" >&2
compose logs --tail 80 backend storefront >&2 || true
set_tag "$PREVIOUS"
compose up -d --remove-orphans
wait_healthy || echo "[deploy] ATTENTION : le rollback n'est pas sain non plus" >&2
exit 1
