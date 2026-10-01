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
