# infra

Infrastructure de production sur le VPS OVH Nocido. Tout est **préparé** dans ce dossier ;
rien n'est lancé automatiquement sur le VPS tant que les commandes de la section
« Première installation » n'ont pas été exécutées (chacune est à valider avant).

## Topologie

```
Internet ──443──> Nginx (hôte)
   essadrati.nocido.com        ──> 127.0.0.1:3120  storefront (conteneur Next.js standalone)
   api-essadrati.nocido.com    ──> 127.0.0.1:3121  backend    (conteneur Medusa : /store, /auth)
                               ──> /opt/essadrati/uploads     (médias servis en /static/)
   admin-essadrati.nocido.com  ──> 127.0.0.1:3121  backend    (dashboard /app, API /admin)

backend ──> redis:7-alpine          réseau Docker interne (172.31.11.0/24), sans sortie
backend ──> PostgreSQL 17 (hôte)    via host.docker.internal, réseau edge 172.31.10.0/24
storefront ──> backend              http://backend:9000 sur le réseau edge
```

- Ports hôte 3120/3121 liés à 127.0.0.1 (3000/3001 et 3100-3104 sont déjà pris).
- Conteneurs non-root, `cap_drop: ALL`, `no-new-privileges`, healthchecks, logs tournants
  (5 × 10 Mo).
- Le backend contient Chromium et les polices Noto (latin + arabe) pour les PDF ; son sandbox
  est désactivé (`PDF_BROWSER_NO_SANDBOX=true`) car les user namespaces sont retirés.
- Le dashboard est compilé avec `ADMIN_BACKEND_URL=/` : il appelle sa propre origine (domaine
  admin), ce qui évite le CORS et survit à un changement de domaine sans rebuild.

## Isolation sur le VPS partagé

Ressources créées, toutes préfixées `essadrati` : dossier `/opt/essadrati`, utilisateur
`deploy-essadrati`, base et rôle PostgreSQL `essadrati`, une ligne `pg_hba.conf`
`host essadrati essadrati 172.16.0.0/12 scram-sha-256` (même modèle que school_dev,
sellnow_dev, tourath_dev), site Nginx `essadrati.conf`, zones `limit_req` `essadrati_*`,
certificat `essadrati.nocido.com`, cron `/etc/cron.d/essadrati-backup`, projet Compose
`essadrati`.

**Non modifiés** : UFW (5432 est déjà ouvert à `172.16.0.0/12`), `postgresql.conf`
(`listen_addresses = '*'` déjà en place), `nginx.conf`, sshd, fail2ban, les autres vhosts,
bases, conteneurs et `.env`.

## Fichiers

| Fichier                              | Rôle                                                             |
| ------------------------------------ | ---------------------------------------------------------------- |
| `../docker-compose.prod.yml`         | backend, storefront, redis ; réseaux edge/internal               |
| `../.env.prod.example`               | variables Compose (ports, tag, sous-réseaux, mot de passe Redis) |
| `env/backend.prod.env.example`       | secrets et URLs du backend                                       |
| `env/storefront.prod.env.example`    | runtime du storefront                                            |
| `docker/backend.Dockerfile`          | image Medusa multi-stage, Chromium pour les PDF                  |
| `docker/storefront.Dockerfile`       | image Next.js standalone multi-stage                             |
| `nginx/essadrati.bootstrap.conf`     | phase 1 : HTTP seul, défi ACME                                   |
| `nginx/essadrati.conf`               | phase 2 : HTTPS des trois domaines, cache, limitation            |
| `nginx/essadrati-proxy.inc`          | en-têtes de proxy communs (inclus par `essadrati.conf`)          |
| `postgres/create-essadrati-db.sh`    | rôle + base `essadrati`                                          |
| `postgres/allow-essadrati-pg-hba.sh` | ajoute la ligne pg_hba (diff, confirmation, reload, retour auto) |
| `backup/essadrati-backup.sh`         | dump `-Fc` + médias `tar.zst`, rotation 14 j, hors-site rclone   |
| `backup/essadrati-backup.cron`       | cron 05:00                                                       |
| `backup/essadrati-restore.sh`        | restauration base ou médias                                      |
| `scripts/deploy.sh`                  | déploie un tag GHCR, attend `healthy`, rollback sinon            |
| `../.github/workflows/deploy.yml`    | CI → images GHCR → déploiement SSH → healthcheck public          |

## Première installation (commandes à valider une par une)

Prérequis DNS : `essadrati`, `api-essadrati` et `admin-essadrati` en A/AAAA vers le VPS.

1. Utilisateur de déploiement (même modèle que `deploy-wimo`) et dossier :

   ```sh
   sudo adduser --disabled-password --gecos "" deploy-essadrati
   sudo usermod -aG docker deploy-essadrati
   sudo install -d -o deploy-essadrati -g deploy-essadrati -m 750 /opt/essadrati /opt/essadrati/staging
   sudo install -d -o 1000 -g 1000 -m 755 /opt/essadrati/uploads
   sudo -u deploy-essadrati install -d -m 700 /home/deploy-essadrati/.ssh
   # coller la clé publique de déploiement dans /home/deploy-essadrati/.ssh/authorized_keys (600)
   ```

2. Fichiers du projet dans `/opt/essadrati` (copie depuis le poste ou `git clone` du dépôt) :
   `docker-compose.prod.yml`, `infra/`, puis `.env.prod`, `infra/env/backend.prod.env`,
   `infra/env/storefront.prod.env` remplis à partir des `*.example` (`chmod 600`).

3. Base de données :

   ```sh
   sudo bash /opt/essadrati/infra/postgres/create-essadrati-db.sh
   sudo bash /opt/essadrati/infra/postgres/allow-essadrati-pg-hba.sh
   ```

4. Nginx phase 1 et certificat (webroot, comme les autres projets) :

   ```sh
   sudo cp /opt/essadrati/infra/nginx/essadrati.bootstrap.conf /etc/nginx/sites-available/essadrati.conf
   sudo ln -s /etc/nginx/sites-available/essadrati.conf /etc/nginx/sites-enabled/essadrati.conf
   sudo nginx -t && sudo systemctl reload nginx
   sudo certbot certonly --webroot -w /var/www/certbot --cert-name essadrati.nocido.com \
     -d essadrati.nocido.com -d api-essadrati.nocido.com -d admin-essadrati.nocido.com
   ```

5. Nginx phase 2 (HTTPS) :

   ```sh
   sudo cp /opt/essadrati/infra/nginx/essadrati.conf /etc/nginx/sites-available/essadrati.conf
   sudo nginx -t && sudo systemctl reload nginx
   ```

6. Premier démarrage (images publiées par GitHub Actions, connexion GHCR avec un jeton
   `read:packages`) :

   ```sh
   cd /opt/essadrati
   docker login ghcr.io -u maaroufsalah
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
   docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend npx medusa exec ./src/scripts/setup-store.js
   docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend npx medusa exec ./src/scripts/seed-cities.js
   docker compose --env-file .env.prod -f docker-compose.prod.yml exec backend npx medusa user -e <email> -p <mot de passe>
   ```

   Catalogue initial facultatif : `npx medusa exec ./src/scripts/seed-catalog.js` (lit
   `data/seed/`, à vérifier dans l'image ; sinon saisir le catalogue dans l'admin).

   La clé publiable créée par le setup va dans la variable GitHub
   `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, puis un nouveau déploiement reconstruit le storefront.

7. Sauvegardes :

   ```sh
   sudo cp /opt/essadrati/infra/backup/essadrati-backup.cron /etc/cron.d/essadrati-backup
   sudo /opt/essadrati/infra/backup/essadrati-backup.sh --dry-run
   ```

8. GitHub : secrets `VPS_HOST`, `VPS_USER=deploy-essadrati`, `VPS_SSH_KEY`,
   `VPS_KNOWN_HOSTS` ; variables listées en tête de `deploy.yml` ; enfin
   `DEPLOY_ENABLED=true`.

## Déploiement, mise à jour, rollback

Chaque push sur `main` : CI (lint, types, tests, builds) → images
`ghcr.io/maaroufsalah/essadrati-{backend,storefront}:<sha>` et `:latest` → copie de
`docker-compose.prod.yml` et `infra/` → `infra/scripts/deploy.sh <sha>` → healthcheck public.
Les migrations Medusa tournent au démarrage du backend (`RUN_MIGRATIONS=true`).

- Si les conteneurs ne deviennent pas `healthy` en 4 minutes, `deploy.sh` revient seul au tag
  précédent ; si le healthcheck public échoue, le workflow lance `deploy.sh --rollback`.
- Rollback manuel : `/opt/essadrati/infra/scripts/deploy.sh --rollback`, ou
  `deploy.sh <ancien sha>` pour une version précise.
- Une migration de base n'est pas annulée par un rollback d'image : restaurer la sauvegarde
  si besoin.

## Sauvegarde et restauration

`pg-hote-backup` (03:15) inclut déjà la base `essadrati` dans son `pg_dumpall`.
`essadrati-backup.sh` (05:00) ajoute `essadrati_db_<date>.dump` et
`essadrati_uploads_<date>.tar.zst` dans `/opt/backups/daily/` (rotation 14 jours, copie
hors-site si `/opt/essadrati/backup.env` définit `OFFSITE_REMOTE`).

```sh
sudo bash /opt/essadrati/infra/backup/essadrati-restore.sh db /opt/backups/daily/essadrati_db_<date>.dump
sudo bash /opt/essadrati/infra/backup/essadrati-restore.sh uploads /opt/backups/daily/essadrati_uploads_<date>.tar.zst
```

## Bascule vers essadratibio.ma

1. DNS : `essadratibio.ma`, `www`, `api` et `admin` (ou les sous-domaines choisis) vers le VPS.
2. Nginx : copier `essadrati.conf` en remplaçant les `server_name` et le chemin du
   certificat, ajouter une redirection 301 des anciens noms `*.nocido.com` vers les nouveaux.
3. Certificat : `certbot certonly --webroot -w /var/www/certbot --cert-name essadratibio.ma
-d essadratibio.ma -d www.essadratibio.ma -d api.essadratibio.ma -d admin.essadratibio.ma`.
4. `infra/env/backend.prod.env` : `MEDUSA_BACKEND_URL`, `STORE_CORS`, `ADMIN_CORS`,
   `AUTH_CORS`, `FILE_BASE_URL`, `STOREFRONT_URL`, `ADMIN_URL`.
5. Variables GitHub : `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_SITE_URL`,
   `PUBLIC_*_URL`, puis redéployer (le storefront intègre ces valeurs au build ; le dashboard
   n'a pas besoin d'être reconstruit).
6. Les URLs des médias déjà téléversés contiennent l'ancien domaine : les garder servies par
   la redirection, ou les réécrire en base (`UPDATE` sur les tables d'images Medusa) après
   sauvegarde.
7. Search Console / Merchant Center / Meta : déclarer le nouveau domaine, le sitemap
   `https://essadratibio.ma/sitemap.xml` et les flux `/feeds/<langue>/google.xml`.

## Plusieurs clients sur le même VPS

Chaque client a son dossier `/opt/<client>`, son `COMPOSE_PROJECT_NAME`, ses ports
`BACKEND_PORT`/`STOREFRONT_PORT`, ses sous-réseaux Docker (dans `172.16.0.0/12`, sans
chevauchement), sa base et son rôle PostgreSQL avec leur ligne `pg_hba`, son site Nginx et ses
zones `limit_req` préfixées, son certificat et son cron de sauvegarde.
