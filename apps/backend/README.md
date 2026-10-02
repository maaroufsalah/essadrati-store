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
  Le panier est créé dans le locale du client (`fr-MA`…) : titres des lignes traduits.
- `GET /store/cod/orders/:id` : suivi public (état, timeline placed → confirmed → shipped →
  delivered ou cancelled, articles, totaux, prénom, ville, téléphone masqué). L'id ULID de la
  commande sert de lien secret ; jamais de nom complet, d'adresse ni de téléphone en clair.
- `POST /store/cod/orders/lookup` : `{ phone, display_id }` → `{ order_id }` si les deux
  correspondent, sinon le même 404 (`order.notFound`).
- `POST /admin/cod/orders/:id/confirm|cancel`, CRUD `/admin/cod/zones` et `/admin/cod/cities`,
  `POST /admin/cod/cities/import` (CSV : `slug,name_ar,name_fr,name_en,zone_code,fee,days_min,days_max,active`).
- `POST /store/carts/:id/shipping-methods` et `/store/carts/:id/complete` sont fermées (403) :
  elles laisseraient le client choisir les données de livraison.

Les clients sans email reçoivent une adresse technique `<téléphone>@<technicalEmailDomain>`.
`store:setup` crée l'infrastructure COD (emplacement de stock, ensemble de livraison, option
calculée, providers sur la région) et les villes de `data/moroccan-cities.json`
(`pnpm --filter @nocido/backend cities:seed` pour les seules villes).

## Notifications de commande

`src/lib/notifications` envoie, à chaque événement COD, un email HTML brandé (logo, couleurs du
thème, coordonnées et raison sociale des StoreSettings) dans la langue de la commande
(`metadata.locale`, RTL en arabe) et un message WhatsApp :

| Événement Medusa                     | Message                               |
| ------------------------------------ | ------------------------------------- |
| `cod.order_placed`                   | commande reçue + alerte boutique      |
| `cod.order_confirmed` / `_cancelled` | confirmée / annulée                   |
| `shipment.created`                   | expédiée (`no_notification` respecté) |
| `delivery.created`                   | livrée                                |

- Email client seulement si le client a donné une adresse (champ facultatif du formulaire
  COD) ; les adresses techniques `@technicalEmailDomain` sont ignorées.
- Alerte boutique (langue par défaut) vers `contact.email`, sinon l'expéditeur SMTP, avec un
  lien vers la commande dans l'admin (`ADMIN_URL`, défaut `MEDUSA_BACKEND_URL/app`).
- Transport Nodemailer construit à chaque envoi depuis `StoreSettings.smtp` (mot de passe
  chiffré) ; sans SMTP, l'envoi est ignoré et journalisé. Une erreur d'envoi n'affecte jamais
  la commande.
- WhatsApp : interface `WhatsAppChannel`, implémentation `log` (stub, numéro masqué) en
  attendant un fournisseur (WhatsApp Cloud API…).
- Liens de suivi : `STOREFRONT_URL/<locale>/order/<id>`.
- Textes génériques dans `messages.ts` (ar, fr, en, mêmes placeholders vérifiés par test).
- Admin : page **Paramètres › Notifications** : aperçu de chaque message dans chaque langue
  avec la dernière commande COD (`GET /admin/notifications/preview`) et envoi test
  (`POST /admin/notifications/test`).

Choix : pas de provider du module Notification de Medusa. Un provider ne peut pas lire le
module `store-settings` et il faudrait faire transiter le mot de passe SMTP dans les données de
notification stockées en base.

## Factures et bons de livraison (PDF)

`src/lib/documents` produit, pour une commande COD, une **facture** et un **bon de livraison**
en français à partir des StoreSettings (`billing` : raison sociale, ICE, RC, IF, patente,
CNSS, TVA, préfixe, pied de facture ; `contact` ; logo et couleurs du thème) :

- facture `PREFIXE-AAAA-000042` (année de la commande, numéro de commande), lignes TTC, frais
  de livraison, HT/TVA si la boutique est assujettie (sinon « TVA non applicable »), montant en
  lettres (« Arrêtée la présente facture à la somme de … dirhams »), mode de paiement ;
- bon de livraison `BL-000042` : destinataire, téléphone en grand, articles, **montant à
  encaisser**, remarque du client, cadres de signature.

Les noms arabes (client, produits, adresse) sont isolés (`<bdi dir="auto">`) et le rendu passe
par Chromium : liaison et ordre des lettres corrects. Interface `PdfRenderer`
(`renderer.ts`) ; implémentation `chromium` via `puppeteer-core` (aucun navigateur
téléchargé) : `PDF_BROWSER_PATH`, sinon détection de Chromium/Chrome/Edge. En conteneur :
paquet `chromium` + polices arabes, `PDF_BROWSER_NO_SANDBOX=true` si nécessaire.

Routes : `GET /admin/cod/orders/:id/documents/invoice|delivery-note` (téléchargement,
`?inline=1` pour afficher) et `GET /admin/documents/preview?type=…` (dernière commande COD).
Admin : boutons sur la carte COD de la commande, aperçu dans **Paramètres › Facturation**.

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

## Modules `hero-slides` et `category-banners`

Contenu de l'accueil hors StoreSettings, une ligne par élément :

- `hero-slides` (`hero_slide`) : images ordinateur (1920 × 900) et mobile (1080 × 1350),
  titre, sous-titre et texte du bouton par langue, lien (catégorie, produit ou URL http(s) / chemin),
  alignement `start | center | end`, assombrissement 0-60 %, durée 3-20 s, actif, rang.
- `category-banners` (`category_banner`, section « Nos univers ») : images ordinateur
  (1200 × 1500) et mobile (1080 × 1080), titre, accroche et texte du bouton par langue, lien,
  actif, rang. Module séparé des catégories Medusa : une bannière peut aussi pointer vers un
  produit (coffret) ou une URL.

Schémas partagés dans `@nocido/types` (`heroSlideInputSchema`, `categoryBannerInputSchema`,
`reorderInputSchema`). Images téléversées par le File Module (`POST /admin/uploads`).

| Route                                     | Accès         | Rôle                                    |
| ----------------------------------------- | ------------- | --------------------------------------- |
| `GET /store/hero-slides`                  | clé publiable | Slides actives par rang (cache 30 s)    |
| `GET /store/category-banners`             | clé publiable | Bannières actives par rang (cache 30 s) |
| `GET/POST /admin/hero-slides`             | admin         | Liste complète, création                |
| `GET/POST/DELETE /admin/hero-slides/:id`  | admin         | Lecture, mise à jour, suppression       |
| `POST /admin/hero-slides/reorder`         | admin         | `{ ids }` : tous les ids, dans l'ordre  |
| `…/admin/category-banners` (mêmes routes) | admin         | Idem pour les bannières                 |

Chaque écriture revalide le tag `hero-slides` ou `category-banners` du storefront. Un
réordonnancement doit lister **tous** les ids (liste périmée refusée : `reorder.mismatch`).
L'ordre et l'affichage des blocs de l'accueil (`homepage.sections`) et les options du slider
(`homepage.slider`) restent dans les StoreSettings.

**Nettoyage des images** (`src/lib/media-cleanup.ts`) : quand une slide ou une bannière
remplace une image, ou est supprimée, le fichier abandonné est effacé du File Module
(`static/`), après la revalidation du storefront, sauf s'il est encore référencé (autres slides
ou bannières, StoreSettings, pages CMS, produits ; recherche par id et URL). Un échec ne fait
que journaliser. L'admin supprime aussi les fichiers téléversés dans un éditeur puis jamais
enregistrés (`DELETE /admin/uploads/:id`).

**Recherche de liens** : `GET /admin/home-links?type=category|product&q=…&locale=fr` renvoie 10
cibles dont le handle, le nom de base ou le nom traduit (table `translation`) contient `q` ;
`&handle=…` renvoie celle qui a ce handle (libellé d'un lien enregistré).

`catalog:seed` crée 3 slides et 3 bannières (`data/seed/home.json`, visuels SVG générés) tant
que les listes sont vides ; `SEED_HOME=force` les recrée.
