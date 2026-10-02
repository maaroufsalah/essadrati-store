#!/usr/bin/env bash
# ============================================================
#  Crée le rôle et la base de production `essadrati` dans le PostgreSQL 17
#  de l'hôte (cluster 17/main). Ne touche à aucune autre base ni à aucun
#  autre rôle. Idempotent : refuse de recréer ce qui existe.
#  Usage (sur le VPS) : sudo bash infra/postgres/create-essadrati-db.sh
#  Le mot de passe est demandé (non affiché) : le reporter dans
#  /opt/essadrati/infra/env/backend.prod.env (DATABASE_URL).
# ============================================================
set -euo pipefail

ROLE="essadrati"
DB="essadrati"

[ "$(id -u)" -eq 0 ] || { echo "à lancer avec sudo" >&2; exit 1; }
pg() { sudo -u postgres "$@"; }

if pg psql -Atc "SELECT 1 FROM pg_roles WHERE rolname = '${ROLE}'" | grep -q 1; then
  echo "le rôle ${ROLE} existe déjà : rien à faire" >&2
  exit 1
fi
if pg psql -Atc "SELECT 1 FROM pg_database WHERE datname = '${DB}'" | grep -q 1; then
  echo "la base ${DB} existe déjà : rien à faire" >&2
  exit 1
fi

read -r -s -p "Mot de passe du rôle ${ROLE} (openssl rand -base64 33) : " PASSWORD
echo
[ "${#PASSWORD}" -ge 24 ] || { echo "mot de passe trop court (24 caractères minimum)" >&2; exit 1; }

# Le mot de passe passe par une variable psql, jamais par la ligne de commande.
pg psql -v ON_ERROR_STOP=1 -v role="${ROLE}" -v db="${DB}" -v pw="${PASSWORD}" <<'SQL'
CREATE ROLE :"role" LOGIN PASSWORD :'pw' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE DATABASE :"db" OWNER :"role" ENCODING 'UTF8' TEMPLATE template0;
REVOKE CONNECT ON DATABASE :"db" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"db" TO :"role";
SQL

echo "rôle et base ${DB} créés."
echo "Étape suivante : sudo bash infra/postgres/allow-essadrati-pg-hba.sh"
