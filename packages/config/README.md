# @nocido/config

Configuration partagée par toutes les apps et tous les packages du kit.

## TypeScript

| Fichier                 | Pour                                |
| ----------------------- | ----------------------------------- |
| `tsconfig/base.json`    | Réglages stricts communs            |
| `tsconfig/library.json` | Packages internes buildés avec tsup |
| `tsconfig/next.json`    | Storefront Next.js 15               |
| `tsconfig/node.json`    | Backend Medusa et scripts Node      |

```json
{ "extends": "@nocido/config/tsconfig/next.json" }
```

`base.json` active `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride` et
`noImplicitReturns`.

## ESLint (flat config, ESLint 9)

| Export                         | Pour                                                 |
| ------------------------------ | ---------------------------------------------------- |
| `@nocido/config/eslint/base`   | TypeScript typé, `any` interdit, imports de types    |
| `@nocido/config/eslint/node`   | Backend et scripts                                   |
| `@nocido/config/eslint/next`   | Storefront : Next, hooks React, a11y, garde-fous kit |
| `@nocido/config/eslint/guards` | Garde-fous seuls, réutilisés par le mobile           |

```js
// apps/storefront/eslint.config.js
export { default } from "@nocido/config/eslint/next";
```

### Garde-fous du kit

Ils transforment deux règles du projet en erreurs de lint dans les apps clientes :

- **RTL.** Les classes physiques comme `ml-4`, `pr-2`, `left-0`, `text-right` ou
  `rounded-tl-lg` sont refusées. On utilise `ms`, `me`, `ps`, `pe`, `start`, `end`,
  `text-start` et `rounded-s`.
- **Pas de valeur en dur.** Les couleurs de la palette Tailwind, les couleurs littérales
  hexadécimales ou `rgb()`, et le texte JSX en dur sont refusés. Les couleurs viennent des
  tokens du thème, le texte des messages next-intl ou des StoreSettings.

Les fichiers de test et le dossier `e2e` sont exclus. Les cas couverts sont dans
`test/guards.test.js` :

```sh
pnpm --filter @nocido/config test
```

## Tailwind v4

```css
@import "tailwindcss";
@import "@nocido/config/tailwind/preset.css";
```

Le preset supprime la palette Tailwind par défaut et enregistre uniquement les tokens du
kit : `bg`, `fg`, `card`, `card-fg`, `primary`, `primary-fg`, `accent`, `accent-fg`,
`muted`, `muted-fg`, `border`, `ring`, `success`, `warning`, `danger`. Il définit aussi les
radius `base`, `card` et `button`, les polices `display` et `body`, et les ombres `soft`
et `card`.

Les valeurs du preset sont des sentinelles neutres. Les vraies valeurs sont générées par
`@nocido/theme` à partir des StoreSettings, puis injectées côté serveur dans un `<style>`
hors layer. Un style hors layer l'emporte toujours sur le `@layer theme` de Tailwind, sans
`!important`.

Le preset ajoute les utilitaires `pb-safe` et `pt-safe` pour les safe areas iOS, et
`touch-target` pour les cibles tactiles de 44px minimum.
