# CLAUDE.md — essadrati-store

Kit e-commerce de référence Nocido. Premier client : Essadrati (miel, argan, amlou).
Un repo par client, sans multi-tenant. Lire aussi le `README.md` racine et le README de
chaque package avant de modifier quoi que ce soit.

## Stack figée

Ne pas changer de version majeure ni de mineure sans accord explicite.

| Domaine        | Choix                                                                     |
| -------------- | ------------------------------------------------------------------------- |
| Runtime        | Node 22.23.3 (`.nvmrc`, via fnm), pnpm 10.34.5 (corepack)                 |
| Monorepo       | pnpm workspaces (linker isolé) + Turborepo 2.11                           |
| Langage        | TypeScript 5.9 strict, ESLint 9 flat config, Prettier 3                   |
| Backend        | Medusa **2.21.1** (`apps/backend`), API store + admin + dashboard         |
| Admin          | Plugin Medusa UI-only (`apps/admin`, étape 6)                             |
| Storefront     | Next.js 15.x App Router, Tailwind v4, shadcn/ui, Framer Motion,           |
|                | next-intl (ar, fr, en, RTL pour ar), next-themes                          |
| Mobile         | Expo + Expo Router + NativeWind (`apps/mobile`, **reporté**, voir étapes) |
| Packages       | `@nocido/config`, `@nocido/types` (zod 4), `@nocido/theme`,               |
|                | `@nocido/api-client`                                                      |
| Base           | PostgreSQL 17 de l'hôte VPS, hors Docker                                  |
| Cache / events | In-memory en dev. Redis 7 (conteneur) en prod uniquement                  |
| Fichiers       | Medusa File Module, provider local, servi par Nginx                       |

## Règles

### Hébergement

- Tout est hébergé sur le VPS OVH Nocido (Nginx, PostgreSQL hors Docker, Docker pour les
  conteneurs du projet). **Pas** de Railway, Vercel, Cloudinary, Resend ni autre SaaS.
- Sur le VPS : ne toucher à **aucune** autre app, base, conteneur, site Nginx, `.env`, ni à
  UFW, fail2ban, sshd ou `nginx.conf`. Créer uniquement des ressources préfixées
  `essadrati`. Projet déployé dans `/opt/essadrati`.
- Toute commande non réversible sur le VPS est affichée d'abord, puis on attend l'OK.
- Postgres n'est jamais exposé. En dev on passe par un tunnel SSH :

  ```sh
  ssh -N -L 5433:127.0.0.1:5432 nocido
  ```

  Bases : `essadrati_dev` (dev) et `essadrati_test` (tests d'intégration), rôle
  `essadrati_dev`. Le mot de passe est dans `apps/backend/.env`, jamais dans le repo.

### Code

- **Aucun domaine, couleur, texte ou contact en dur dans le code.** Tout vient des
  StoreSettings (admin) ou des variables d'environnement. Les garde-fous ESLint de
  `@nocido/config/eslint/guards` vérifient couleurs, texte JSX et propriétés physiques.
- RTL : propriétés logiques uniquement (`ms`/`me`, `ps`/`pe`, `start`/`end`).
- `any` interdit. Les types partagés viennent de `@nocido/types` (zod, source unique).
- Secrets : seuls les fichiers `*.example` sont versionnés.
- Pas de `docker-compose.yml` de dev : la base de dev est sur le VPS, via le tunnel.
  `docker-compose.prod.yml` et `infra/docker/*.Dockerfile` restent la référence prod.
- `REDIS_URL` n'est requis qu'en production.
- Revalidation du cache storefront : le backend appelle
  `STOREFRONT_REVALIDATE_URL/api/revalidate` (origine du storefront vue depuis le backend :
  `http://localhost:3000` en dev, `http://storefront:3000` en Docker) avec
  `REVALIDATE_SECRET`. Ne pas confondre avec `STOREFRONT_URL`, l'URL publique.
- **Ne pas installer `apps/mobile`** : l'app mobile est reportée après la mise en
  production du storefront.

### Pièges connus (Windows, dev local)

- Le watcher de `medusa develop` est instable sous Windows : après une modification de
  fichier, il plante parfois au redémarrage (`taskkill` PID introuvable). Relancer le
  serveur à la main.
- Le build Next `standalone` n'est généré que sous Linux, donc dans Docker : sous Windows,
  ses symlinks pnpm exigent le mode développeur, `next.config.ts` le désactive.
- Ne jamais lancer `pnpm setup` (commande intégrée de pnpm, modifie le PATH) : le script
  backend s'appelle `store:setup`.

### Git

- Commits conventionnels **atomiques, un par étape**, scopes de `commitlint.config.mjs`.
- Checkpoints à valider avec Salah-Eddine avant de continuer : **après l'étape 5** (validé),
  **après l'étape 14**, **après l'étape 16c** (avec l'app mobile, reportée).

## Ordre des étapes

| Étape   | Contenu                                                                                  | État    |
| ------- | ---------------------------------------------------------------------------------------- | ------- |
| 0       | Monorepo pnpm + Turborepo, config partagée                                               | fait    |
| 1       | `@nocido/types` : schémas zod StoreSettings, ThemeConfig                                 | fait    |
| 2       | `@nocido/theme` : 7 presets, tokens, contraste WCAG                                      | fait    |
| 3       | Backend Medusa : scaffold, région Maroc/MAD, module Translation                          | fait    |
| 3bis    | `@nocido/api-client` : client Medusa typé partagé                                        | fait    |
| 4       | Module Medusa `store-settings` (API admin + store)                                       | fait    |
| 5       | Fondations storefront : i18n RTL, thème sans flash, settings, header/footer              | fait    |
|         | **Checkpoint 1**                                                                         | validé  |
| 6       | Plugin admin : pages Settings                                                            | fait    |
| 7       | Admin : thème (presets, tokens, aperçu, contraste), branding de l'admin                  | fait    |
| 8       | Backend COD : villes marocaines, paiement `cod`, livraison `manual-cod`                  | fait    |
| 9       | Seed catalogue Essadrati                                                                 | fait    |
| 10      | Module CMS `pages`                                                                       | fait    |
| 11      | Storefront UI kit                                                                        | fait    |
| 12      | Storefront accueil                                                                       | fait    |
| 13      | Storefront catégorie                                                                     | fait    |
| 14      | Storefront produit + commande COD                                                        | fait    |
| 15      | Storefront panier, checkout COD multi-produits, WhatsApp flottant                        | fait    |
| 16      | Storefront page merci, suivi de commande, recherche numéro + téléphone                   | fait    |
| 17      | Storefront pages CMS `/[locale]/[handle]`, liens du pied de page                         | fait    |
| 18      | Tracking GTM/GA4/Meta/TikTok depuis les settings, consentement cookies                   | fait    |
| 19      | SEO : métadonnées, OG dynamiques, sitemaps par langue, robots, flux Google/Meta          | fait    |
| 20      | Notifications : emails brandés par langue (SMTP des settings), stub WhatsApp, admin      | fait    |
| 21      | PDF facture et bon de livraison                                                          |         |
| 14      | **Checkpoint 2**                                                                         |         |
| 16a–16d | App mobile Expo (`apps/mobile`) : **reportée après la mise en production du storefront** | reporté |
| 16c     | **Checkpoint 3** (avec l'app mobile)                                                     | reporté |
| 21bis   | Infra VPS : Nginx, scripts Postgres, sauvegardes, CI/CD                                  |         |
| 23      | README final : déploiement VPS et adaptation du kit à un client                          |         |

## URLs

Staging (domaine final `essadratibio.ma` plus tard) :

| Variable             | Valeur                             |
| -------------------- | ---------------------------------- |
| `STOREFRONT_URL`     | https://essadrati.nocido.com       |
| `MEDUSA_BACKEND_URL` | https://api-essadrati.nocido.com   |
| `ADMIN_URL`          | https://admin-essadrati.nocido.com |

Dev local : backend `http://localhost:9000` (dashboard `/app`), storefront
`http://localhost:3000`.

## Commandes utiles

```sh
pnpm install
pnpm --filter @nocido/backend dev        # tunnel SSH ouvert au préalable
pnpm --filter @nocido/backend store:setup      # région Maroc / MAD, canal, clé publiable
pnpm --filter @nocido/storefront dev
pnpm lint && pnpm typecheck && pnpm test
```
