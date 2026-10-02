---
name: vps-nginx-deploy
description: Deploying this store on the shared Nocido OVH VPS (Docker Compose, host PostgreSQL, Nginx, certbot, backups, GitHub Actions to GHCR, rollback) without touching other projects. Use for anything under infra/, docker-compose.prod.yml or .github/workflows/deploy.yml, and before any command on the VPS.
---

# VPS deployment

Full procedure: `infra/README.md`. Host: `ssh nocido` (sudo), Ubuntu, PostgreSQL 17 on the
host, Docker Compose v5, Nginx 1.26, certbot webroot `/var/www/certbot`.

## Isolation rules (non negotiable)

- Touch **no** other app, database, container, Nginx site, `.env`, nor UFW, fail2ban, sshd or
  `nginx.conf`. Create only resources prefixed `essadrati`, project in `/opt/essadrati`.
- **Show every non-reversible command and wait for the user's OK** (user creation, certbot,
  `docker compose up` in production, Nginx or `pg_hba.conf` changes). Never `rm -rf`, never
  `docker system prune`; show the diff before changing anything under `/etc/nginx`.
- Read-only inspection (ports, Docker networks, `pg_hba.conf`, UFW status, crons) is fine and
  should come first.

## Facts about the host (checked read-only)

- Ports 3000-3003, 3100-3104, 4001-4005, 8000, 8069… are taken: essadrati uses **3120**
  (storefront) and **3121** (backend), bound to 127.0.0.1.
- Docker subnets 172.17-172.30 are taken (**172.30.0.0/16 by transport-toulouse**): essadrati
  uses `172.31.10.0/24` (edge) and `172.31.11.0/24` (internal).
- UFW already allows 5432 from `172.16.0.0/12`, PostgreSQL listens on `*`: only one
  `pg_hba.conf` line per app (`host essadrati essadrati 172.16.0.0/12 scram-sha-256`), added by
  `infra/postgres/allow-essadrati-pg-hba.sh` (diff, confirmation, reload, automatic restore).
- `/opt/pg-hote-backup/backup.sh` (03:15) dumps every host database; other backups run at
  03:00-04:30. essadrati's own backup (DB `-Fc` + uploads) runs at 05:00, same conventions.
- Deploy users follow `deploy-wimo`: own account in the `docker` group.

## Pipeline

push `main` → `.github/workflows/deploy.yml`: CI (`ci.yml`: lint, types, tests, builds, e2e,
Lighthouse) → images `ghcr.io/maaroufsalah/essadrati-{backend,storefront}:<sha>` → rsync of
compose + `infra/` → `infra/scripts/deploy.sh <sha>` (pull, up, wait healthy, rollback) →
public healthcheck (rollback on failure). Deployment stays off until `DEPLOY_ENABLED=true`;
the storefront image is built only when the `NEXT_PUBLIC_*` variables exist.

## Gotchas

- Storefront `NEXT_PUBLIC_*` values are baked at build time (GitHub variables). The dashboard
  uses `ADMIN_BACKEND_URL=/` and needs no rebuild on a domain change.
- The backend image embeds Chromium + Noto fonts for PDFs (`PDF_BROWSER_NO_SANDBOX=true`,
  `shm_size: 256m`).
- Nginx: phase 1 `essadrati.bootstrap.conf` (ACME only) before the certificate exists, then
  `essadrati.conf`; `limit_req` zones are prefixed `essadrati_`.
- Media are served by Nginx at `/static/` from `/opt/essadrati/uploads` (owned by uid 1000).
