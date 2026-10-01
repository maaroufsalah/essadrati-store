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
