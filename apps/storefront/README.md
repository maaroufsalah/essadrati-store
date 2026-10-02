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

## Messages

`messages/{ar,fr,en}.json` contiennent uniquement le texte d'interface. `fr.json` est la
référence de typage (`src/global.d.ts`). Un test vérifie que les trois fichiers ont les mêmes
clés et les mêmes placeholders ICU.

## Variables

Voir `.env.example`. Les `NEXT_PUBLIC_*` sont intégrées au build (build args Docker).
`MEDUSA_INTERNAL_URL` sert aux appels serveur sur le réseau Docker.
