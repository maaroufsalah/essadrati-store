# infra

Fichiers d'infrastructure du VPS. Cette étape pose les bases : Dockerfiles, compose de
production et exemples d'env. La configuration Nginx, les scripts PostgreSQL et de
sauvegarde, et la CI/CD GitHub Actions arrivent à l'étape 21bis.

## Topologie de production

```
Internet ──443──> Nginx (hôte) ──> 127.0.0.1:3000  storefront  (conteneur)
                               ──> 127.0.0.1:9000  backend     (conteneur, API + admin)
                               ──> /srv/essadrati/uploads      (fichiers servis par Nginx)

backend ──> redis                  réseau Docker interne, sans accès extérieur
backend ──> PostgreSQL (hôte)      via host.docker.internal
```

- Aucun port de conteneur n'est publié sur une interface publique.
- Les conteneurs tournent en utilisateur non-root, sans capabilities Linux, avec
  `no-new-privileges`.
- Les logs Docker tournent à 5 fichiers de 10 Mo par service.

## Dockerfiles

Les deux images se construisent depuis la racine du monorepo avec `turbo prune`, ce qui
limite le contexte à l'app et à ses packages.

| Fichier                        | Image               | Healthcheck   |
| ------------------------------ | ------------------- | ------------- |
| `docker/backend.Dockerfile`    | Medusa, API + admin | `/health`     |
| `docker/storefront.Dockerfile` | Next.js standalone  | `/api/health` |

Le backend exécute les migrations au démarrage si `RUN_MIGRATIONS=true`.

Les valeurs `NEXT_PUBLIC_*` du storefront sont intégrées au build. Elles sont passées en
build args par la CI, pas au runtime.

## Fichiers d'environnement

| Fichier                         | Lu par                    |
| ------------------------------- | ------------------------- |
| `.env.prod` à la racine         | `docker-compose.prod.yml` |
| `infra/env/backend.prod.env`    | Conteneur backend         |
| `infra/env/storefront.prod.env` | Conteneur storefront      |

Chaque fichier a son `*.example` versionné. Les vrais fichiers ne sont jamais versionnés.

## PostgreSQL de l'hôte

Les conteneurs utilisent le sous-réseau fixe `DOCKER_EDGE_SUBNET`, par défaut
`172.30.10.0/24`. PostgreSQL doit écouter sur la passerelle Docker et autoriser ce
sous-réseau pour le rôle dédié, uniquement :

```
# postgresql.conf
listen_addresses = 'localhost,172.17.0.1'

# pg_hba.conf
host  essadrati  essadrati  172.30.10.0/24  scram-sha-256
```

```sh
sudo ufw allow from 172.30.10.0/24 to any port 5432 proto tcp
```

Le script de création de la base et du rôle arrive à l'étape 21bis.

## Plusieurs clients sur le même VPS

Chaque client a son propre `COMPOSE_PROJECT_NAME`, ses ports `BACKEND_PORT` et
`STOREFRONT_PORT`, son `UPLOADS_DIR`, son `DOCKER_EDGE_SUBNET` et sa base PostgreSQL.
