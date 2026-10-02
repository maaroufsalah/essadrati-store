# @nocido/admin

Plugin Medusa 2.21.1, côté UI uniquement : il ajoute les pages de réglages du kit au
dashboard (`/app/settings/...`, section « Extensions »). Il ne contient ni module ni route
d'API ; le backend sert `/admin/store-settings`.

| Page          | Route                    | Sections StoreSettings                                             |
| ------------- | ------------------------ | ------------------------------------------------------------------ |
| Identité      | `/settings/identity`     | `identity` (nom, slogan, logos, favicon, OG), `seo`                |
| Contact       | `/settings/contact`      | `contact`, `smtp` (+ email de test)                                |
| Facturation   | `/settings/billing`      | `billing`                                                          |
| Langues       | `/settings/localization` | `localization`                                                     |
| Marketing     | `/settings/marketing`    | `marketing` (suivi, barre d'annonce)                               |
| Livraison COD | `/settings/cod-shipping` | Zones et villes COD (CRUD, import/export CSV) — API `/admin/cod/*` |
| Thème         | `/settings/theme`        | `theme` (presets, tokens light/dark, polices, radius, mode)        |

La route native `/settings/store` de Medusa (devises, locales) reste intacte : ne jamais
nommer une page du plugin comme une page native.

## Fonctionnement

- **Formulaires** : react-hook-form + les schémas zod de `@nocido/types`. Le backend
  revalide tout ; ses erreurs (`issues[].path`, clé i18n) sont replacées sur les champs.
- **Indicateur « non enregistré »** basé sur `dirtyFields`, avertissement avant de quitter.
- **Uploads** : `POST /admin/uploads` (File Module), dimensions lues dans le navigateur.
- **Mot de passe SMTP** : en écriture seule. Champ vide = conservé, interrupteur pour
  l'effacer. L'email de test utilise les réglages enregistrés.
- **Textes** : `src/admin/lib/i18n.ts` (fr de référence, en complet, vérifié par le typage),
  langue du dashboard lue dans `localStorage.lng`.

## Pages CMS

Menu principal « Pages » (`/pages`) : liste, création et éditeur (`/pages/:id`) avec titre,
contenu Markdown et SEO par langue, aperçu en direct (RTL pour l'arabe), statut et lien de
pied de page.

## Widget commande COD

Sur la page d'une commande COD (`order.details.side.before`) : statut de confirmation,
appel et WhatsApp en un clic, boutons Confirmer et Annuler (workflow `confirm-cod`).

## Thème

- Galerie des 7 presets (vignettes light et dark). Choisir un preset reprend ses polices et
  arrondis et efface les couleurs personnalisées.
- Chaque token est personnalisable séparément en light et en dark (« Revenir au preset »).
- Aperçu live (header, carte produit, bouton, accents) dans les deux modes, avec le rapport
  de contraste WCAG AA. L'enregistrement est refusé sous 4.5:1 (3:1 pour l'anneau de focus),
  côté admin et côté backend.
- Les polices de l'aperçu sont chargées depuis Google Fonts, dans l'admin uniquement. Le
  storefront les auto-héberge avec next/font.

## Branding de l'admin Medusa

Surcharge volontairement limitée, dans un seul fichier : `src/admin/styles/admin-overrides.css`
(boutons primaires, accents interactifs, radius des boutons, light et dark). Les valeurs
viennent de `GET /branding` (route publique du backend) et sont posées sur `<html>` par
`lib/branding.ts`, chargé par le widget de la barre supérieure. Le widget `login.before`
affiche le logo de la boutique sur la page de connexion.

## Build

```sh
pnpm --filter @nocido/admin build     # medusa plugin:build -> .medusa/server
```

Le backend charge le plugin via `plugins` dans `medusa-config.ts`. Turborepo le construit
avant le backend (`dev` et `build` dépendent de `^build`). Après une modification du
plugin : rebuild, puis redémarrer le backend.
