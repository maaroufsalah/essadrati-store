#!/usr/bin/env bash
# ============================================================
#  Autorise les conteneurs essadrati (réseau Docker dans 172.16.0.0/12, déjà
#  ouvert au port 5432 par UFW) à joindre la base `essadrati` avec le rôle
#  `essadrati`, sur le modèle des lignes existantes (school_dev, sellnow_dev,
#  tourath_dev). Ajoute UNE ligne à pg_hba.conf, après sauvegarde, affiche le
#  diff et demande confirmation, puis recharge PostgreSQL (pas de redémarrage).
#  Ni postgresql.conf ni UFW ne sont modifiés.
#  Usage (sur le VPS) : sudo bash infra/postgres/allow-essadrati-pg-hba.sh
#  Retour arrière : la sauvegarde horodatée est indiquée à la fin.
# ============================================================
set -euo pipefail

HBA="/etc/postgresql/17/main/pg_hba.conf"
LINE="host    essadrati       essadrati       172.16.0.0/12           scram-sha-256"

[ "$(id -u)" -eq 0 ] || { echo "à lancer avec sudo" >&2; exit 1; }
[ -f "$HBA" ] || { echo "$HBA introuvable" >&2; exit 1; }

if grep -qE '^\s*host\s+essadrati\s+essadrati\s' "$HBA"; then
  echo "la ligne essadrati est déjà présente : rien à faire"
  exit 0
fi

BACKUP="${HBA}.essadrati-$(date +%Y%m%d_%H%M%S)"
TMP="$(mktemp)"
# Insérée après la dernière ligne applicative existante (172.16.0.0/12).
awk -v line="$LINE" '
  { lines[NR] = $0; if ($0 ~ /^host[ \t].*172\.16\.0\.0\/12/) last = NR }
  END {
    for (i = 1; i <= NR; i++) { print lines[i]; if (i == last) print line }
    if (!last) print line
  }' "$HBA" > "$TMP"

echo "--- diff proposé pour $HBA ---"
diff -u "$HBA" "$TMP" || true
read -r -p "Appliquer ce changement et recharger PostgreSQL ? (oui/non) " ANSWER
[ "$ANSWER" = "oui" ] || { rm -f "$TMP"; echo "abandon, rien n'a changé"; exit 1; }

cp -p "$HBA" "$BACKUP"
cat "$TMP" > "$HBA"
rm -f "$TMP"
sudo -u postgres psql -Atc "SELECT pg_reload_conf()" > /dev/null
if sudo -u postgres psql -Atc "SELECT count(*) FROM pg_hba_file_rules WHERE error IS NOT NULL" | grep -qv '^0$'; then
  cp -p "$BACKUP" "$HBA"
  sudo -u postgres psql -Atc "SELECT pg_reload_conf()" > /dev/null
  echo "erreur dans pg_hba.conf : fichier restauré" >&2
  exit 1
fi
echo "ligne ajoutée et PostgreSQL rechargé. Sauvegarde : $BACKUP"
