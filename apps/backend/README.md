# @nocido/backend

Backend Medusa 2.21.1 : API store, API admin et dashboard (`/app`).

## Démarrage

```sh
pnpm db:tunnel                                  # à la racine, terminal dédié
cp .env.example .env                            # renseigner DATABASE_URL et les secrets
pnpm --filter @nocido/backend db:migrate
pnpm --filter @nocido/backend store:setup
pnpm --filter @nocido/backend dev               # http://localhost:9000/app
```

`store:setup` est idempotent. Il crée, à partir de `SETUP_COUNTRY` et `SETUP_CURRENCY` :

- la devise par défaut du store ;
- une locale Medusa par locale du kit, dérivée du pays : `ar-MA`, `fr-MA`, `en-MA` ;
- la région et la région fiscale du pays, avec le provider de paiement système ;
- la clé publiable liée au canal de vente par défaut. Le script affiche son token.

Les noms de région et de locale sont calculés avec `Intl.DisplayNames` : aucun texte client
dans le code.

## Modules

| Module                               | Dev       | Prod (`NODE_ENV=production`) |
| ------------------------------------ | --------- | ---------------------------- |
| Cache, event bus, workflows, locking | in-memory | Redis (`REDIS_URL` requis)   |
| Translation (feature flag activé)    | Postgres  | Postgres                     |
| File (provider local)                | `static/` | `FILE_UPLOAD_DIR`, via Nginx |

`JWT_SECRET`, `COOKIE_SECRET` et `REDIS_URL` sont obligatoires au démarrage en production.
`medusa build` ne les exige pas : l'image Docker se construit sans secret.

## Traductions

Le storefront envoie la locale avec l'en-tête `x-medusa-locale` (voir `toMedusaLocale` dans
`@nocido/types`). Les produits, variantes et catégories renvoient alors leurs champs
traduits.

## Module `store-settings`

Une seule ligne en base (`store_settings`) : le JSON des StoreSettings, validé par
`@nocido/types` à chaque lecture et écriture, et le mot de passe SMTP chiffré en
AES-256-GCM avec `SETTINGS_ENCRYPTION_KEY`.

| Route                        | Accès          | Réponse                                          |
| ---------------------------- | -------------- | ------------------------------------------------ |
| `GET /store/store-settings`  | clé publiable  | `{ settings }` public : sans SMTP, RIB ni banque |
| `GET /admin/store-settings`  | admin connecté | `{ settings }` complet, `smtp.passwordSet` seul  |
| `POST /admin/store-settings` | admin connecté | Mise à jour partielle par section                |

- **Lecture tolérante.** Un champ absent prend la valeur par défaut du kit. Une section
  devenue invalide retombe sur ses défauts et un avertissement est loggé.
- **Écriture stricte.** Le payload est validé par `storeSettingsUpdateSchema`, fusionné
  section par section (`contact.socials` un niveau plus bas), revalidé en entier, puis le
  thème doit passer les contrôles de contraste WCAG. Sinon : `400` avec
  `issues: [{ path, code }]`, où `code` est une clé i18n (`phone.invalid`,
  `theme.contrast`, `settings.unknownKey`...).
- **Mot de passe SMTP.** `password` absent le conserve, `null` l'efface, une chaîne le
  remplace. Il n'est jamais renvoyé.
- **Workflow.** `update-store-settings` sauvegarde avec compensation, puis émet
  `store_settings.updated`. Le subscriber demande au storefront de revalider le tag
  `store-settings` (`STOREFRONT_REVALIDATE_URL` + `REVALIDATE_SECRET`).

## Tests

```sh
pnpm --filter @nocido/backend test               # unitaires, sans base
pnpm --filter @nocido/backend test:integration   # base essadrati_test, tunnel ouvert
```

Les tests d'intégration utilisent `@medusajs/test-utils` sous Vitest. Ils lisent
`DB_TEST_URL` et ne créent ni ne suppriment de base : le rôle n'a pas `CREATEDB`.

## Paiement à la livraison (COD)

| Élément                                    | Rôle                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Module `moroccanCities`                    | Zones (frais, délais) et villes (noms ar/fr/en, surcharges, actives)               |
| Provider paiement `pp_cod_cod`             | Autorise la commande ; l'encaissement est la « capture » à la livraison            |
| Provider livraison `manual-cod_manual-cod` | Prix calculé, fourni par le workflow, jamais par le client                         |
| Workflow `place-cod-order`                 | Panier (ou articles), adresse, frais, session COD, commande, `cod_status=pending`  |
| Workflow `confirm-cod`                     | `pending → confirmed`, `pending/confirmed → cancelled` (annule la commande Medusa) |

Routes :

- `GET /store/cities` : villes actives avec frais et délais.
- `POST /store/cod/orders` : `{ cart_id }` ou `{ items }`, `customer { name, phone }`,
  `city_id`, `address?`, `note?`, `locale?`. Les frais sont calculés côté serveur
  (gratuits au-delà de `commerce.freeShippingThreshold`, minimum `commerce.minOrderAmount`).
- `POST /admin/cod/orders/:id/confirm|cancel`, CRUD `/admin/cod/zones` et `/admin/cod/cities`,
  `POST /admin/cod/cities/import` (CSV : `slug,name_ar,name_fr,name_en,zone_code,fee,days_min,days_max,active`).
- `POST /store/carts/:id/shipping-methods` et `/store/carts/:id/complete` sont fermées (403) :
  elles laisseraient le client choisir les données de livraison.

Les clients sans email reçoivent une adresse technique `<téléphone>@<technicalEmailDomain>`.
`store:setup` crée l'infrastructure COD (emplacement de stock, ensemble de livraison, option
calculée, providers sur la région) et les villes de `data/moroccan-cities.json`
(`pnpm --filter @nocido/backend cities:seed` pour les seules villes).

## Seed du catalogue client

```sh
pnpm --filter @nocido/backend catalog:seed                       # idempotent
SEED_SETTINGS=force pnpm --filter @nocido/backend catalog:seed   # ré-applique les réglages
```

Les données du client sont dans `data/seed/` (le code reste générique) :

- `catalog.json` : catégories, collections, produits, variantes (poids), prix TTC. `compareAt`
  devient le prix normal de la variante et `price` le prix d'une liste de prix « sale »
  (`calculated_price.original_amount` / `calculated_amount` côté store).
- `store-settings.json` : réglages par défaut, appliqués seulement si aucun réglage n'a encore
  été enregistré.

Les champs de base sont écrits dans la langue par défaut du store ; les autres langues
deviennent des traductions (module Translation : produits, options, catégories, collections).
Note : l'API store de Medusa 2.21 traduit produits, catégories et collections, mais pas les
options imbriquées ; le storefront nomme l'option « poids » avec ses propres messages.
Les images sont des placeholders SVG générés (bocal, bouteille, coffret), à remplacer dans
l'admin.

## Module CMS `pages`

Pages de contenu (notre histoire, FAQ, livraison, contact) : `handle`, titre, contenu Markdown
et SEO par langue, statut brouillon/publié, lien de pied de page et ordre. Schémas partagés :
`pageInputSchema`, `pageSchema` (`@nocido/types`).

| Route                              | Accès         | Rôle                                          |
| ---------------------------------- | ------------- | --------------------------------------------- |
| `GET /store/pages`                 | clé publiable | Pages publiées sans contenu (footer, sitemap) |
| `GET /store/pages/:handle`         | clé publiable | Page publiée avec contenu, 404 sinon          |
| `GET/POST /admin/pages`            | admin         | Liste (brouillons compris), création          |
| `GET/POST/DELETE /admin/pages/:id` | admin         | Lecture, mise à jour, suppression             |

Chaque écriture revalide le tag `pages` du storefront. `catalog:seed` crée les 4 pages de
`data/seed/pages.json`. Le contenu est rendu sans HTML brut (react-markdown).
