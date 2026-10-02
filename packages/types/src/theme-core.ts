/* Theme constants without zod (client bundles); theme.ts adds the schemas. */

export const COLOR_TOKENS = [
  "bg",
  "fg",
  "card",
  "cardFg",
  "primary",
  "primaryFg",
  "accent",
  "accentFg",
  "muted",
  "mutedFg",
  "border",
  "ring",
  "success",
  "warning",
  "danger",
] as const;
export type ColorToken = (typeof COLOR_TOKENS)[number];

/** Theme mode choices. */
export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];
