# @nocido/theme

Presets de thème, générateur de tokens, contrôle de contraste WCAG, catalogue de polices
arabes et valeurs par défaut du kit. Utilisé par le storefront, l'admin, le mobile et le
backend, qui valide le thème à chaque sauvegarde.

## Presets

Chaque preset définit 15 tokens en light et 15 tokens en dark, dédiés et non inversés,
plus un radius et une paire de polices.

| Id               | Nom            | Polices display / body                  |
| ---------------- | -------------- | --------------------------------------- |
| `heritage-dore`  | Héritage doré  | Amiri / IBM Plex Sans Arabic (défaut)   |
| `minimal-blanc`  | Minimal blanc  | Readex Pro / IBM Plex Sans Arabic       |
| `nuit-elegante`  | Nuit élégante  | El Messiri / IBM Plex Sans Arabic       |
| `vert-nature`    | Vert nature    | Reem Kufi / Noto Kufi Arabic            |
| `bleu-confiance` | Bleu confiance | Noto Kufi Arabic / IBM Plex Sans Arabic |
| `rose-douce`     | Rose douce     | El Messiri / Readex Pro                 |
| `terracotta`     | Terracotta     | Amiri / Noto Naskh Arabic               |

Héritage doré reprend les couleurs de la marque Essadrati : crème `#F7F1E6`, brun
`#2B1B0E` et or `#E9B44C`.

## Sens des tokens

| Token                          | Usage                                               |
| ------------------------------ | --------------------------------------------------- |
| `bg`, `fg`                     | Fond de page et texte principal                     |
| `card`, `cardFg`               | Surfaces : cards, drawers, sheets                   |
| `primary`, `primaryFg`         | Remplissage des CTA et texte dessus                 |
| `accent`, `accentFg`           | Liens et texte d'emphase, ou remplissage secondaire |
| `muted`, `mutedFg`             | Zones discrètes et texte secondaire                 |
| `border`, `ring`               | Bordures et anneau de focus                         |
| `success`, `warning`, `danger` | Messages d'état                                     |

`primary` sert uniquement de remplissage, jamais de texte sur `bg`. Pour un lien, on
utilise `accent`.

## Contraste

`generateTokens` refuse tout thème dont une paire texte sur fond passe sous 4.5:1. L'anneau
de focus doit atteindre 3:1. La liste des paires est dans `src/contrast.ts`. Les 7 presets
passent toutes les paires dans les deux modes, et les tests le vérifient.

## API

```ts
import { generateTokens, generateTokensOrFallback, contrastReport } from "@nocido/theme";
import { DEFAULT_THEME_CONFIG, DEFAULT_PUBLIC_STORE_SETTINGS } from "@nocido/theme/defaults";

const result = generateTokens(config);
if (!result.ok) showIssues(result.issues); // admin : bloque la sauvegarde

// Storefront : ne lève jamais d'erreur, retombe sur le preset seul si besoin.
const tokens = generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG);
tokens.css; // ":root{--color-bg:#F7F1E6;...}.dark{...}" à injecter côté serveur
```

| Sortie    | Contenu                                                            |
| --------- | ------------------------------------------------------------------ |
| `css`     | Feuille à injecter hors layer dans `<head>`, `:root` puis `.dark`  |
| `cssVars` | Mêmes valeurs en objet, par mode                                   |
| `colors`  | Couleurs fusionnées, par mode                                      |
| `native`  | Variables pour NativeWind, radius en nombres, noms de polices Expo |

Le générateur revalide la config avec le schéma zod. La sortie CSS ne contient donc que
des couleurs hex validées, des entiers et des piles de polices connues.

## Polices

Le catalogue `FONTS` liste 12 polices Google avec support arabe et latin. Chaque police
déclare sa variable CSS, par exemple `--font-amiri`. Le chargeur next/font du storefront
doit utiliser exactement ce nom. `expoFontName` donne le nom enregistré par
`@expo-google-fonts`, par exemple `Amiri_700Bold`.

## Valeurs par défaut

`@nocido/theme/defaults` exporte le thème par défaut et des StoreSettings neutres. Le
storefront et le mobile ne s'en servent que si l'API est indisponible ou qu'un champ est
vide. Les données du client viennent toujours des StoreSettings.
