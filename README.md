# essadrati-store

Boutique e-commerce d'Essadrati : miel naturel, huile d'argan, amlou et coffrets.
Premier store de Nocido Solutions et kit de référence pour les prochains clients.
Un repo par client, sans multi-tenant.

> Ce README est complété à chaque étape. La version finale, avec le guide de
> déploiement VPS et le guide « adapter le kit à un nouveau client », arrive à l'étape 23.

## Structure

```
apps/
  backend/      Medusa v2 : API + admin            (étape 3)
  admin/        Plugin Medusa UI-only : pages Settings (étape 6)
  storefront/   Next.js 15 App Router               (étape 5)
  mobile/       Expo + Expo Router + NativeWind     (étape 16a)
packages/
  config/       tsconfig, ESLint, preset Tailwind v4
  types/        Types et schémas zod partagés       (étape 1)
  theme/        Presets, tokens, contraste, polices (étape 2)
  api-client/   Client Medusa typé partagé          (étape 3bis)
infra/
  docker/       Dockerfiles multi-stage + entrypoint
  env/          Exemples d'env de production par app
docker-compose.prod.yml  Production VPS : backend, storefront, redis
```

Les packages partagés utilisent le scope `@nocido/*`. Ils restent identiques d'un client à
l'autre. Seuls le contenu, les settings et les URLs changent.

## Prérequis

| Outil   | Version                                  |
| ------- | ---------------------------------------- |
| Node.js | 22.23.3 (`.nvmrc`), installé avec fnm    |
| pnpm    | 10.34.5, via corepack (`packageManager`) |
| SSH     | accès au VPS (alias `nocido`)            |

```sh
fnm use            # lit .nvmrc
corepack enable
pnpm install
```

## Développement local

Pas de Docker en dev. La base de dev (`essadrati_dev`) et la base de tests
(`essadrati_test`) vivent sur le PostgreSQL du VPS, jamais exposé : on y accède par un
tunnel SSH. Cache, bus d'événements, moteur de workflows et verrous tournent en mémoire ;
Redis n'est utilisé qu'en production.

```sh
pnpm db:tunnel                          # terminal dédié : localhost:5433 -> VPS 127.0.0.1:5432
cp apps/backend/.env.example apps/backend/.env   # puis renseigner le mot de passe
pnpm --filter @nocido/backend db:migrate
pnpm --filter @nocido/backend store:setup     # région, devise, canal de vente, clé publiable
pnpm dev                                # toutes les apps via Turborepo
```

## Scripts racine

| Script           | Rôle                              |
| ---------------- | --------------------------------- |
| `pnpm dev`       | Lance toutes les apps en mode dev |
| `pnpm build`     | Build de tout le monorepo         |
| `pnpm lint`      | ESLint partout                    |
| `pnpm typecheck` | TypeScript strict partout         |
| `pnpm test`      | Tests unitaires                   |
| `pnpm format`    | Prettier                          |
| `pnpm db:tunnel` | Tunnel SSH vers la base de dev    |

## Conventions

- **Commits conventionnels** vérifiés par commitlint via un hook husky.
  Scopes autorisés : `admin`, `api-client`, `backend`, `config`, `deps`, `docs`, `infra`,
  `mobile`, `release`, `storefront`, `theme`, `types`.
- **TypeScript strict**, `any` interdit par ESLint.
- **Aucune valeur en dur côté client.** Le storefront et le mobile n'ont ni texte, ni couleur,
  ni coordonnée en dur. Les règles ESLint de `@nocido/config/eslint/guards` le vérifient :
  propriétés physiques left/right, couleurs de la palette Tailwind, couleurs littérales et
  texte JSX en dur sont des erreurs.
- **Secrets** : jamais dans le repo. Seuls les fichiers `*.example` sont versionnés.

## Pourquoi `node-linker=hoisted`

Medusa v2 et Expo attendent tous les deux un `node_modules` plat. Le mode hoisted de pnpm
est la disposition qu'ils supportent officiellement dans un monorepo pnpm.
