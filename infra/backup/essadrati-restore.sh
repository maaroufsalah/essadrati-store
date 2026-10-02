#!/usr/bin/env bash
# ============================================================
#  Restaure une sauvegarde essadrati (base et/ou médias).
#  Arrête le backend pendant la restauration, puis le relance.
#  Usage (sur le VPS, depuis /opt/essadrati) :
#    sudo bash infra/backup/essadrati-restore.sh db      /opt/backups/daily/essadrati_db_<stamp>.dump
#    sudo bash infra/backup/essadrati-restore.sh uploads /opt/backups/daily/essadrati_uploads_<stamp>.tar.zst
#  Une confirmation est demandée : l'opération remplace les données actuelles.
# ============================================================
set -euo pipefail

KIND="${1:-}"
FILE="${2:-}"
DB="essadrati"
APP_DIR="/opt/essadrati"
UPLOADS_DIR="${UPLOADS_DIR:-${APP_DIR}/uploads}"

[ "$(id -u)" -eq 0 ] || { echo "à lancer avec sudo" >&2; exit 1; }
[ -f "$FILE" ] || { echo "usage : $0 db|uploads <fichier>" >&2; exit 2; }
compose() { docker compose --env-file "${APP_DIR}/.env.prod" -f "${APP_DIR}/docker-compose.prod.yml" "$@"; }

read -r -p "Remplacer les données actuelles (${KIND}) par $(basename "$FILE") ? (oui/non) " ANSWER
[ "$ANSWER" = "oui" ] || { echo "abandon"; exit 1; }

compose stop backend
case "$KIND" in
  db)
    pg_restore -l "$FILE" > /dev/null
    sudo -u postgres pg_restore --clean --if-exists --no-owner --role="$DB" -d "$DB" "$FILE"
    ;;
  uploads)
    zstd -q -t "$FILE"
    mv "$UPLOADS_DIR" "${UPLOADS_DIR}.before-restore-$(date +%Y%m%d_%H%M%S)"
    zstd -dc "$FILE" | tar -C "$(dirname "$UPLOADS_DIR")" -xf -
    chown -R 1000:1000 "$UPLOADS_DIR"
    ;;
  *)
    echo "type inconnu : ${KIND} (db ou uploads)" >&2
    compose start backend
    exit 2
    ;;
esac
compose start backend
echo "restauration ${KIND} terminée ; backend relancé."
