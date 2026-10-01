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

## Messages

`messages/{ar,fr,en}.json` contiennent uniquement le texte d'interface. `fr.json` est la
référence de typage (`src/global.d.ts`). Un test vérifie que les trois fichiers ont les mêmes
clés et les mêmes placeholders ICU.

## Variables

Voir `.env.example`. Les `NEXT_PUBLIC_*` sont intégrées au build (build args Docker).
`MEDUSA_INTERNAL_URL` sert aux appels serveur sur le réseau Docker.
