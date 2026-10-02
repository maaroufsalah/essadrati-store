# @nocido/storefront

Storefront Next.js 15 (App Router, React 19), Tailwind v4, composants shadcn/ui, next-intl
(ar, fr, en, RTL pour l'arabe), next-themes et motion. Aucun texte client, aucune couleur
ni coordonnée en dur : tout vient des StoreSettings et des messages next-intl.

## Démarrage

```sh
cp .env.example .env     # clé publiable affichée par `store:setup` côté backend
pnpm --filter @nocido/storefront dev    # http://localhost:3000
```

Le backend doit tourner (`pnpm --filter @nocido/backend dev`). S'il est indisponible, le
site reste en ligne avec les StoreSettings neutres du kit et l'erreur est loggée.

## Fondations

| Sujet        | Fonctionnement                                                                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Locales      | Toujours préfixées (`/ar`, `/fr`, `/en`). Le middleware lit les locales actives et la locale par défaut dans les StoreSettings (cache mémoire 60 s) et redirige une locale désactivée vers la locale par défaut. |
| RTL          | `<html lang dir>` posé par le layout. Propriétés logiques uniquement (`ms`, `pe`, `start`...). Le menu mobile s'ouvre côté `start`.                                                                              |
| Thème        | Tokens générés par `@nocido/theme` depuis `settings.theme`, injectés côté serveur dans un `<style>` hors layer : aucune couleur ne dépend du JS.                                                                 |
| Sans flash   | next-themes pose la classe `.dark` par un script bloquant avant le premier rendu. Mode par défaut : `settings.theme.defaultMode`.                                                                                |
| Polices      | Les 12 polices du catalogue sont auto-hébergées par next/font, sans preload. Seules les deux polices du thème reçoivent leur variable CSS.                                                                       |
| Settings     | `getStoreSettings()` : `cache()` React + cache de données Next, tag `store-settings`.                                                                                                                            |
| Revalidation | `POST /api/revalidate`, en-tête `x-revalidate-secret`, tags du kit uniquement. Appelé par le backend après chaque sauvegarde.                                                                                    |
| Santé        | `GET /api/health` pour le healthcheck Docker.                                                                                                                                                                    |

## Kit UI

| Dossier               | Contenu                                                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ui`       | shadcn/ui sur les tokens : Button (pilule), Card (radius-card), Input, Textarea, Label, Sheet (côté start), Drawer (vaul), Accordion, Badge, Skeleton |
| `components/motion`   | Reveal, Stagger, Pressable, CountUp (motion, sous la ligne de flottaison uniquement)                                                                  |
| `components/commerce` | Price, RatingStars, ProductImage / ImagePlaceholder, ProductCard (+ skeleton)                                                                         |
| `lib/format.ts`       | Prix et nombres selon `localization.defaultCurrency` et `numberingSystem` (latn/arab)                                                                 |
| `lib/product-view.ts` | Produit Medusa → données de carte (prix le plus bas, prix barré, note)                                                                                |
| `lib/catalog.ts`      | Produits, catégories, collections (serveur, tag `catalog`, 1 h)                                                                                       |

`/[locale]/ui-kit` montre le kit avec les vrais produits, en développement seulement (404 en
production). Points de contrôle : 390, 768-1024 et 1280-1440 px.

## Accueil

Sections (`app/[locale]/page.tsx`, ISR 1 h + tags `store-settings` et `catalog`) : barre promo,
hero éditorial, engagements, catégories, best-sellers (carrousel scroll-snap sur mobile, grille
2/4 colonnes), histoire sur fond sombre (classe `dark` locale) avec chiffres animés, coffrets
(collection `homepage.giftCollectionHandle`), avis clients, footer. Tout le contenu vient de
`StoreSettings.homepage` (page admin « Accueil ») et du catalogue Medusa ; les titres de
section sont des messages.

Les réglages sont lus de façon tolérante (`settingsFallback`) : une section absente ou
invalide reprend les défauts du kit sans faire tomber le reste (décalage de versions pendant
un déploiement).

## Catégorie

`/[locale]/c/[handle]` : grille 2/3/4 colonnes, filtres prix et poids (feuille en bas sur
mobile et tablette, barre latérale dès 1024 px), tri (recommandés, prix, nouveautés),
pagination de 12. L'état vit dans l'URL (`?w=500g,1kg&min=100&max=400&sort=price_asc&page=2`) :
formulaires GET qui marchent sans JavaScript, appliqués côté client avec JavaScript.

L'API store de Medusa ne filtre ni ne trie par prix : les produits de la catégorie (jusqu'à
100, en cache `catalog`) sont filtrés en mémoire (`lib/category.ts`, testé). La catégorie est
résolue avant le streaming (pas de `loading.tsx`) : un handle inconnu renvoie un vrai 404 ;
les résultats sont streamés derrière un squelette. Métadonnées et hreflang par langue
(`lib/seo.ts`).

## Produit et commande COD

`/[locale]/p/[handle]` : galerie (scroll-snap et points sur mobile, vignettes dès 1024 px),
prix promo, choix du poids, formulaire COD en une étape (nom, téléphone marocain validé,
ville issue de `moroccan-cities`, quantité) avec frais et délai estimés selon la ville,
lien WhatsApp prérempli, accordéons (description, livraison, retours), produits liés,
JSON-LD Product/Offer, métadonnées et hreflang.

La commande passe par la server action `lib/cod-action.ts` → `POST /store/cod/orders`
(workflow `place-cod-order`). Le schéma d'entrée est partagé (`codOrderInputSchema`). Chaque
formulaire envoie un en-tête `Idempotency-Key` : un renvoi après un délai dépassé retourne la
commande déjà créée au lieu d'un doublon (cache + verrou côté backend, 24 h). La saisie est
conservée si la commande est refusée. Champ piège anti-robots.

## Panier et checkout

Le panier est un panier Medusa (`lib/cart-actions.ts`, server actions) dont l'id vit dans le
cookie httpOnly `nocido_cart` (30 jours). Il est créé avec le locale Medusa de la langue
(`fr-MA`…) et resynchronisé au changement de langue : Medusa retraduit les lignes.
`CartProvider` charge le panier côté client (les pages restent statiques), le drawer
(`components/cart`) affiche la progression vers la livraison offerte et un stepper par ligne.

`/[locale]/checkout` (noindex) : récapitulatif multi-produits, mêmes champs COD que la page
produit (`components/cod`), frais estimés selon la ville, bouton sticky sur mobile. La
commande part du panier (`placeCheckoutOrder`), le cookie est supprimé après succès.

Sur la page produit, une barre sticky mobile apparaît quand le formulaire sort de l'écran.
Bouton WhatsApp flottant si `whatsappOrderEnabled` et un numéro sont renseignés.

Événements (`lib/analytics.ts`) : `ViewContent`, `AddToCart`, `InitiateCheckout` sont
poussés dans `window.dataLayer` (`nocido_<Event>`) et émis en `nocido:track`, avec un
`eventId` pour la déduplication pixel/serveur.

## Tracking et consentement

`TrackingProvider` (`components/tracking`) charge GTM, GA4, Meta Pixel et TikTok Pixel
uniquement si leur id est renseigné dans StoreSettings (`marketing`) **et** si le visiteur a
accepté les cookies. Sans aucun id, ni bandeau ni script. Le choix est gardé 180 jours dans le
cookie `nocido_consent` (`granted`/`denied`) ; « Gérer les cookies » dans le pied de page
rouvre le bandeau (un refus après acceptation recharge la page pour décharger les scripts).

Chaque événement `nocido:track` est envoyé à Meta (`eventID`), TikTok (`event_id`, Purchase →
`CompletePayment`) et GA4 (schéma ecommerce, `transaction_id`) par `lib/trackers.ts` ; GTM lit
`window.dataLayer` (`nocido_<Event>`). Les événements survenus avant le consentement sont
rejoués à l'acceptation. Déduplication : même événement ignoré pendant 2 s, `Purchase` une
seule fois par commande (`eventId` = id de commande, réutilisable par une future API
Conversions côté serveur). Si GA4 est aussi configuré dans le conteneur GTM, ne renseigner
que l'un des deux pour éviter les doublons.

## Commande : merci et suivi

Après une commande (fiche produit ou checkout), la server action redirige vers
`/[locale]/order/[id]/thanks` (fonctionne aussi sans JavaScript). Cette page émet `Purchase`
une seule fois par commande (`eventId` = id de commande, garde dans `localStorage`) et recharge
le panier. `/[locale]/order/[id]` affiche l'état COD et la timeline (date et fuseau de la
boutique, `localization.timezone`), les articles et un lien WhatsApp d'aide si un numéro est
configuré. `/[locale]/order` retrouve une commande avec son numéro **et** le téléphone utilisé.
Toutes ces pages sont `noindex` et jamais mises en cache. Lien « Suivre ma commande » dans le
pied de page.

## Pages CMS

`/[locale]/[handle]` rend les pages publiées du module `pages` (notre histoire, FAQ, livraison
et retours, contact…) : Markdown par langue avec repli sur la langue par défaut, sans HTML brut
(`components/content/markdown.tsx`, liens internes restant dans la langue courante), fil
d'Ariane, `metaTitle`/`metaDescription` de la page, canonical et hreflang. Rendu au premier
accès puis mis en cache (ISR, tag `pages` revalidé par le backend à chaque sauvegarde). Les
pages `showInFooter` apparaissent dans la colonne « Aide » du pied de page, triées par
`footerRank`, à côté de « Suivre ma commande ». Les segments fixes (`c`, `p`, `checkout`,
`order`) restent prioritaires : ne pas créer de page CMS avec ces handles.

## SEO

- Métadonnées par page et par langue (titre, description, canonical, hreflang avec
  `x-default` via `lib/seo.ts`), Open Graph et carte Twitter `summary_large_image`.
- Images OG générées : `/api/og/<locale>/<home|p|c|page>/<handle>` (1200×630, couleurs du
  thème, nom de la boutique, titre, photo et prix du produit). Le moteur de rendu (Satori) ne
  met pas en forme l'arabe : les cartes des pages arabes utilisent la première langue latine
  activée. L'accueil prend `identity.ogImage` s'il est défini.
- `/sitemap.xml` (index) → `/sitemaps/<locale>.xml` : accueil, catégories, produits, pages
  CMS, avec `xhtml:link` hreflang et `lastmod`.
- `/robots.txt` : tout est ouvert sauf `/api/` (hors `/api/og/`), checkout, commandes, UI kit.
- Flux produits `/feeds/<locale>/google.xml` et `/feeds/<locale>/meta.xml` (RSS Google
  Merchant, accepté par Meta Commerce) : un article par variante avec prix, prix promo,
  disponibilité, images, marque, type. Les `g:id` sont les ids de variantes, comme les
  `content_ids` des pixels. Google refuse les images SVG : utiliser des JPEG/PNG en production.
- Toutes ces routes sont mises en cache une heure (ISR) et se basent sur `NEXT_PUBLIC_SITE_URL`.

## Messages

`messages/{ar,fr,en}.json` contiennent uniquement le texte d'interface. `fr.json` est la
référence de typage (`src/global.d.ts`). Un test vérifie que les trois fichiers ont les mêmes
clés et les mêmes placeholders ICU.

## Variables

Voir `.env.example`. Les `NEXT_PUBLIC_*` sont intégrées au build (build args Docker).
`MEDUSA_INTERNAL_URL` sert aux appels serveur sur le réseau Docker.
