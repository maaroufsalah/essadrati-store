#!/usr/bin/env bash
# ============================================================
#  Sauvegarde quotidienne essadrati : base `essadrati` + médias téléversés.
#  Mêmes conventions que /opt/pg-hote-backup/backup.sh :
#   - fichiers dans /opt/backups/daily/, préfixe propre (essadrati_*)
#   - pg_dump -Fc via sudo -u postgres (peer, aucun mot de passe sur disque),
#     vérifié par pg_restore -l
#   - médias : tar | zstd, vérifié par zstd -t
#   - rotation locale RETENTION jours, journal dans le même dossier
#   - hors-site optionnel : même format de backup.env (rclone/S3) que les
#     autres projets, dans /opt/essadrati/backup.env
#  pg-hote-backup (03:15) inclut déjà la base dans son pg_dumpall ; ce script
#  ajoute les médias et un dump dédié pour restaurer essadrati seul.
#  Cron : /etc/cron.d/essadrati-backup (05:00)
#  Usage : essadrati-backup.sh | essadrati-backup.sh --dry-run
# ============================================================
set -uo pipefail

DB="essadrati"
UPLOADS_DIR="${UPLOADS_DIR:-/opt/essadrati/uploads}"
BACKUP_DIR="/opt/backups/daily"
BACKUP_ENV="${BACKUP_ENV:-/opt/essadrati/backup.env}"
LOG="${BACKUP_DIR}/backup-essadrati.log"
RETENTION=14
STAMP="$(date +%Y%m%d_%H%M%S)"
PREFIX="essadrati"
RC=0

if [ "${1:-}" = "--dry-run" ]; then
  echo "base : ${DB} -> ${BACKUP_DIR}/${PREFIX}_db_${STAMP}.dump"
  echo "médias : ${UPLOADS_DIR} -> ${BACKUP_DIR}/${PREFIX}_uploads_${STAMP}.tar.zst"
  echo "rotation : ${RETENTION} jours ; hors-site : ${BACKUP_ENV}"
  exit 0
fi

mkdir -p "$BACKUP_DIR"; chmod 700 "$BACKUP_DIR"
umask 077
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

log "=== Début sauvegarde essadrati ==="

DUMP="${BACKUP_DIR}/${PREFIX}_db_${STAMP}.dump"
if sudo -u postgres pg_dump -Fc -d "$DB" > "$DUMP" 2>>"$LOG" && [ -s "$DUMP" ] \
   && pg_restore -l "$DUMP" > /dev/null 2>>"$LOG"; then
  log "base OK : $(basename "$DUMP") ($(du -h "$DUMP" | cut -f1))"
else
  rm -f "$DUMP"; log "ÉCHEC : pg_dump ${DB}"; RC=1
fi

ARCHIVE="${BACKUP_DIR}/${PREFIX}_uploads_${STAMP}.tar.zst"
if [ -d "$UPLOADS_DIR" ]; then
  if tar -C "$(dirname "$UPLOADS_DIR")" -cf - "$(basename "$UPLOADS_DIR")" 2>>"$LOG" \
       | zstd -q -T0 -10 -o "$ARCHIVE" && zstd -q -t "$ARCHIVE"; then
    log "médias OK : $(basename "$ARCHIVE") ($(du -h "$ARCHIVE" | cut -f1))"
  else
    rm -f "$ARCHIVE"; log "ÉCHEC : archive des médias"; RC=1
  fi
else
  log "médias : ${UPLOADS_DIR} absent, ignoré"
fi

DELETED=$(find "$BACKUP_DIR" -maxdepth 1 -type f -name "${PREFIX}_*" -mtime "+${RETENTION}" -print -delete | wc -l)
log "rotation : ${DELETED} fichier(s) > ${RETENTION} j supprimé(s)"

# Hors-site : copie du lot du jour si backup.env définit un remote rclone.
if [ -r "$BACKUP_ENV" ]; then
  OFFSITE_REMOTE=""
  # shellcheck disable=SC1090
  . "$BACKUP_ENV"
  if [ -n "$OFFSITE_REMOTE" ] && command -v rclone > /dev/null; then
    if rclone copy "$BACKUP_DIR" "$OFFSITE_REMOTE" --include "${PREFIX}_*_${STAMP}*" >> "$LOG" 2>&1; then
      log "hors-site OK : ${OFFSITE_REMOTE}"
    else
      log "ÉCHEC hors-site"; RC=1
    fi
  else
    log "hors-site : non configuré, ignoré"
  fi
fi

log "=== Fin sauvegarde essadrati (code ${RC}) ==="
exit "$RC"
