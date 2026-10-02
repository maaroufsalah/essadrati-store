# @nocido/admin

Plugin Medusa 2.21.1, côté UI uniquement : il ajoute les pages de réglages du kit au
dashboard (`/app/settings/...`, section « Extensions »). Il ne contient ni module ni route
d'API ; le backend sert `/admin/store-settings`.

| Page        | Route                    | Sections StoreSettings                              |
| ----------- | ------------------------ | --------------------------------------------------- |
| Identité    | `/settings/identity`     | `identity` (nom, slogan, logos, favicon, OG), `seo` |
| Contact     | `/settings/contact`      | `contact`, `smtp` (+ email de test)                 |
| Facturation | `/settings/billing`      | `billing`                                           |
| Langues     | `/settings/localization` | `localization`                                      |
| Marketing   | `/settings/marketing`    | `marketing` (suivi, barre d'annonce)                |

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

## Build

```sh
pnpm --filter @nocido/admin build     # medusa plugin:build -> .medusa/server
```

Le backend charge le plugin via `plugins` dans `medusa-config.ts`. Turborepo le construit
avant le backend (`dev` et `build` dépendent de `^build`). Après une modification du
plugin : rebuild, puis redémarrer le backend.
