# essadrati-store

Boutique e-commerce d'Essadrati : miel naturel, huile d'argan, amlou et coffrets, paiement à
la livraison partout au Maroc. Premier store de Nocido Solutions et **kit de référence** pour
les prochains clients : un repo par client, sans multi-tenant.

| Environnement | Storefront                   | API                              | Admin                                  |
| ------------- | ---------------------------- | -------------------------------- | -------------------------------------- |
| Staging       | https://essadrati.nocido.com | https://api-essadrati.nocido.com | https://admin-essadrati.nocido.com/app |
| Dev local     | http://localhost:3000        | http://localhost:9000            | http://localhost:9000/app              |

Le domaine final `essadratibio.ma` viendra plus tard (voir
[bascule de domaine](infra/README.md#bascule-vers-essadratibioma)).

## Structure

```
apps/
  backend/      Medusa 2.21 : API store + admin, modules store-settings, moroccan-cities,
                pages (CMS), COD, notifications, PDF
  admin/        Plugin Medusa UI-only : pages Paramètres (identité, thème, contact, COD,
                accueil, facturation, notifications, pages CMS…)
  storefront/   Next.js 15 App Router, Tailwind v4, next-intl (ar/fr/en, RTL)
  mobile/       Expo — reporté après la mise en production du storefront (ne pas installer)
packages/
  config/       tsconfig, ESLint (dont les garde-fous « aucune valeur en dur »), Tailwind
  types/        Schémas zod et types partagés (+ entrée @nocido/types/client sans zod)
  theme/        Presets, tokens, contraste WCAG, catalogue de polices
  api-client/   Client Medusa typé, routes et tags de cache du kit
e2e/            Playwright (commande COD, 3 viewports) et Lighthouse CI
infra/          Dockerfiles, env de prod, Nginx, PostgreSQL, sauvegardes, déploiement
.github/        CI (lint, types, tests, builds, e2e, Lighthouse) et déploiement GHCR → VPS
.claude/skills/ Notes de travail pour Claude Code : medusa-v2, theme-tokens, i18n-rtl,
                vps-nginx-deploy
```

Chaque app et package a son README : à lire avant de modifier quoi que ce soit.

## Prérequis

| Outil   | Version                                                |
| ------- | ------------------------------------------------------ |
| Node.js | 22.23.3 (`.nvmrc`), installé avec fnm                  |
| pnpm    | 10.34.5, via corepack (`packageManager`)               |
| SSH     | accès au VPS (alias `nocido`)                          |
| Chrome  | pour les PDF en dev, Playwright et Lighthouse en local |

```sh
fnm use            # lit .nvmrc
corepack enable
pnpm install
```

## Développement local

Pas de Docker en dev. Les bases `essadrati_dev` et `essadrati_test` vivent sur le PostgreSQL
du VPS, jamais exposé : on y accède par un tunnel SSH. Cache, événements, workflows et
verrous tournent en mémoire ; Redis n'existe qu'en production.

```sh
pnpm db:tunnel                                     # terminal dédié : localhost:5433 -> VPS
cp apps/backend/.env.example apps/backend/.env     # mot de passe de la base, secrets de dev
cp apps/storefront/.env.example apps/storefront/.env
pnpm --filter @nocido/backend db:migrate
pnpm --filter @nocido/backend store:setup          # région Maroc/MAD, villes COD, clé publiable
pnpm --filter @nocido/backend catalog:seed         # catalogue, réglages et pages d'exemple
pnpm --filter @nocido/admin build                  # le backend charge le plugin compilé
pnpm --filter @nocido/backend dev                  # http://localhost:9000/app
pnpm --filter @nocido/storefront dev               # http://localhost:3000
```

La clé publiable affichée par `store:setup` va dans `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` du
storefront. Après une modification du plugin admin : `pnpm --filter @nocido/admin build`, puis
redémarrer le backend (le watcher de `medusa develop` est instable sous Windows).

## Tests

```sh
pnpm lint && pnpm typecheck && pnpm test                    # tout le monorepo (Vitest)
pnpm --filter @nocido/backend test:integration              # base essadrati_test, tunnel ouvert
pnpm --filter @nocido/e2e e2e                               # Playwright, storefront + backend lancés
pnpm --filter @nocido/e2e lhci                              # Lighthouse mobile sur un build de prod
```

Voir [`e2e/README.md`](e2e/README.md). Si la CI échoue alors que tout passe en local, rejouer
dans un clone propre : le `node_modules` racine local peut masquer une dépendance non déclarée.

## Déploiement sur le VPS

Tout est décrit dans [`infra/README.md`](infra/README.md). En résumé :

1. **Première installation** (une fois, commandes à valider une par une) : utilisateur
   `deploy-essadrati`, dossier `/opt/essadrati`, base et rôle `essadrati` + une ligne
   `pg_hba`, site Nginx en deux phases (ACME puis HTTPS), certificat des trois sous-domaines,
   premier `docker compose up`, `store:setup`, utilisateur admin, cron de sauvegarde.
2. **GitHub** : secrets `VPS_*`, variables `NEXT_PUBLIC_*` et `PUBLIC_*_URL`, puis
   `DEPLOY_ENABLED=true`.

### Mise à jour

Un push sur `main` lance la CI complète (lint, types, tests, builds, e2e, Lighthouse), construit
les images `ghcr.io/maaroufsalah/essadrati-{backend,storefront}:<sha>`, les déploie par SSH
(`infra/scripts/deploy.sh <sha>`) et vérifie les URLs publiques. Les migrations Medusa tournent
au démarrage du backend.

### Rollback

Automatique si les conteneurs ne deviennent pas sains ou si le healthcheck public échoue.
À la main, sur le VPS :

```sh
/opt/essadrati/infra/scripts/deploy.sh --rollback     # version précédente
/opt/essadrati/infra/scripts/deploy.sh <sha>          # version précise
```

Un rollback d'image n'annule pas une migration : restaurer la sauvegarde si nécessaire.

### Restauration

Sauvegardes quotidiennes dans `/opt/backups/daily/` (base `-Fc` et médias `tar.zst`, 14 jours,
copie hors-site optionnelle) ; la base est aussi dans le `pg_dumpall` de `pg-hote-backup`.

```sh
sudo bash /opt/essadrati/infra/backup/essadrati-restore.sh db /opt/backups/daily/essadrati_db_<date>.dump
sudo bash /opt/essadrati/infra/backup/essadrati-restore.sh uploads /opt/backups/daily/essadrati_uploads_<date>.tar.zst
```

## Ajouter un nouveau client sur le VPS

Chaque client est une pile indépendante, avec des ressources préfixées par son nom (exemple :
`client`) :

| Ressource           | Valeur pour le nouveau client                                                 |
| ------------------- | ----------------------------------------------------------------------------- |
| Repo                | copie du kit (voir ci-dessous)                                                |
| Sous-domaines       | `client.nocido.com`, `api-client.nocido.com`, `admin-client.nocido.com`       |
| Dossier             | `/opt/client`, utilisateur `deploy-client` (groupe docker)                    |
| Base PostgreSQL     | base et rôle `client`, ligne `host client client 172.16.0.0/12 scram-sha-256` |
| Ports hôte          | deux ports libres (`ss -ltn`), ex. 3122/3123                                  |
| Sous-réseaux Docker | libres et dans `172.16.0.0/12`, ex. `172.31.12.0/24`, `172.31.13.0/24`        |
| Compose             | `COMPOSE_PROJECT_NAME=client`, `IMAGE_PREFIX=client`                          |
| Nginx               | `client.conf`, zones `limit_req` `client_*`, certificat `client.nocido.com`   |
| Sauvegarde          | `/etc/cron.d/client-backup` sur un créneau libre                              |

Les scripts d'`infra/` prennent le nom `essadrati` en dur : dans le repo du client, remplacer
`essadrati` par le nom du client dans `infra/`, `docker-compose.prod.yml`, `.env.prod.example`
et `.github/workflows/deploy.yml`, puis suivre la première installation.

## Adapter le kit à un nouveau client

Le code ne contient ni texte de marque, ni couleur, ni coordonnée : tout passe par les
StoreSettings (admin) et les variables d'environnement. Pour un nouveau client :

1. **Repo** : créer le repo du client à partir de celui-ci (historique conservé ou squash),
   renommer `essadrati` dans les noms de ressources (`infra/`, compose, workflows, README) et
   dans `name` des fichiers de doc. Les packages `@nocido/*` ne changent pas.
2. **Données initiales** (`apps/backend/data/`) : `seed/store-settings.json` (identité,
   contact, facturation, commerce, thème, accueil, SEO), `seed/catalog.json` (catégories,
   collections, produits, variantes, prix, traductions), `seed/pages.json` (pages CMS),
   `moroccan-cities.json` (villes, zones, frais, délais). Ou tout saisir dans l'admin.
3. **Thème** : choisir un preset (`heritage-dore`, `minimal-blanc`, `nuit-elegante`…) dans
   Paramètres › Thème, ajuster les couleurs (contraste WCAG vérifié), les polices du catalogue
   et les rayons. Ajouter un preset ou une police se fait dans `@nocido/theme` (et
   `apps/storefront/src/lib/fonts.ts` pour les polices).
4. **Langues** : activer ar/fr/en et la langue par défaut dans Paramètres › Langues ; les
   textes du kit sont dans `apps/storefront/messages/*.json` (et `apps/admin/src/admin/lib/i18n.ts`,
   `apps/backend/src/lib/notifications/messages.ts` pour l'admin et les emails).
5. **Commerce** : COD, seuil de livraison offerte, montant minimum, WhatsApp, domaine des emails
   techniques (Paramètres › Contact et COD) ; villes et frais dans Livraison COD.
6. **Facturation** : raison sociale, ICE, RC, IF, patente, CNSS, TVA, préfixe et pied de
   facture (Paramètres › Facturation, aperçu PDF intégré).
7. **Emails** : SMTP du client (Paramètres › Contact), test dans Paramètres › Notifications.
8. **Marketing** : identifiants GTM, Meta, TikTok, GA4 (chargés seulement après consentement).
9. **Domaines** : variables d'env du backend (`MEDUSA_BACKEND_URL`, CORS, `FILE_BASE_URL`,
   `STOREFRONT_URL`, `ADMIN_URL`) et variables GitHub `NEXT_PUBLIC_*`.
10. **Vérifier** : `pnpm lint && pnpm typecheck && pnpm test`, e2e et Lighthouse sur le seed du
    client, puis première installation VPS.

## Scripts racine

| Script              | Rôle                           |
| ------------------- | ------------------------------ |
| `pnpm dev`          | Toutes les apps en mode dev    |
| `pnpm build`        | Build du monorepo              |
| `pnpm lint`         | ESLint partout                 |
| `pnpm typecheck`    | TypeScript strict partout      |
| `pnpm test`         | Tests unitaires (Vitest)       |
| `pnpm format`       | Prettier                       |
| `pnpm format:check` | Vérification Prettier (CI)     |
| `pnpm db:tunnel`    | Tunnel SSH vers la base de dev |

## Conventions

- **Commits conventionnels** vérifiés par commitlint (hook husky), un par étape. Scopes :
  `admin`, `api-client`, `backend`, `config`, `deps`, `docs`, `infra`, `mobile`, `release`,
  `seo`, `storefront`, `theme`, `tracking`, `types`.
- **TypeScript strict**, `any` interdit.
- **Aucune valeur en dur côté client** : textes, couleurs, coordonnées et domaines viennent des
  StoreSettings ou de l'env. Les garde-fous ESLint de `@nocido/config/eslint/guards` vérifient
  propriétés physiques, couleurs de palette, couleurs littérales et texte JSX en dur.
- **RTL** : propriétés logiques uniquement (`ms`/`me`, `ps`/`pe`, `start`/`end`).
- **Secrets** : jamais dans le repo, seuls les `*.example` sont versionnés.
- **Performance mobile** : règles dans [`apps/storefront/README.md`](apps/storefront/README.md#performance-mobile).

## Linker pnpm isolé

Le monorepo utilise le linker isolé de pnpm, comme le starter monorepo officiel de Medusa
(`medusajs/dtc-starter`) : le backend garde React 18 pour l'admin Medusa, le storefront tourne
en React 19. Chaque app déclare ses dépendances, y compris celles que le bundler de l'admin
charge à l'exécution (`apps/backend/package.json`, `apps/admin/package.json`).
