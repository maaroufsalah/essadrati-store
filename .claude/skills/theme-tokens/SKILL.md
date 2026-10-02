---
name: theme-tokens
description: Theming in this kit (presets, color tokens, WCAG contrast, fonts, no hard-coded colors) for the storefront, admin preview, emails, PDF and OG images. Use when touching colors, fonts, presets or styles.
---

# Theme tokens

Source of truth: `StoreSettings.theme` (admin › Thème), validated by `@nocido/types`, turned
into tokens by `@nocido/theme` (`generateTokens` / `generateTokensOrFallback`).

## Tokens

- Color tokens (`COLOR_TOKENS`): `bg fg card cardFg primary primaryFg accent accentFg muted
mutedFg border ring success warning danger`, for `light` and `dark`.
- CSS variables are injected server-side in the locale layout (`<style id="theme-tokens">`),
  `.dark` set before first paint by next-themes. Tailwind v4 utilities map to them
  (`bg-primary`, `text-muted-fg`, `rounded-card`…).
- Saving a theme whose contrast is below 4.5:1 is refused (`theme.contrast`).
- Outside the browser (emails, PDF, `/api/og`), read `tokens.colors.light` from
  `generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG)`.

## Rules

- **No literal colors** in app code: no hex, no Tailwind palette classes (`bg-red-500`). The
  ESLint guards of `@nocido/config/eslint/guards` reject them, as well as physical properties
  (`ml-*`, `left-*`) and hard-coded JSX text.
- A section can force dark mode with the `dark` class (tokens are redefined under `.dark`).
- Presets live in `@nocido/theme` (`heritage-dore` is Essadrati's « Héritage doré »).

## Fonts

- The catalog is `FONTS` in `packages/theme/src/fonts.ts` (Arabic + Latin Google Fonts).
  `apps/storefront/src/lib/fonts.ts` self-hosts every one with next/font, `preload: false`;
  **weights must match** in both files, and `variable` must equal `FONTS[id].cssVariable`.
- Only the two fonts the theme uses are downloaded (their CSS variables are referenced).
- Each weight is a download before the first paint: keep 2 weights where possible
  (IBM Plex Sans Arabic ships 400/700; medium/semibold render as 400/700).
- Emails use a system stack (web fonts are unreliable in mail clients); PDFs use Noto fonts
  installed in the backend image.

## Checks

```sh
pnpm --filter @nocido/theme test     # presets, contrast, tokens, native font names
```
