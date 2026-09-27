import { z } from "zod";

/** Named theme presets shipped by @nocido/theme. */
export const THEME_PRESET_IDS = [
  "heritage-dore",
  "minimal-blanc",
  "nuit-elegante",
  "vert-nature",
  "bleu-confiance",
  "rose-douce",
  "terracotta",
] as const;
export type ThemePresetId = (typeof THEME_PRESET_IDS)[number];
export const themePresetIdSchema = z.enum(THEME_PRESET_IDS);

/** Color tokens. Each one becomes a CSS variable, e.g. cardFg -> --color-card-fg. */
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

/** Colors are stored as 6-digit hex so contrast can be computed exactly. */
export const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "color.invalid")
  .transform((value) => value.toUpperCase());
export type HexColor = string;

const colorShape = Object.fromEntries(
  COLOR_TOKENS.map((token) => [token, hexColorSchema]),
) as Record<ColorToken, typeof hexColorSchema>;

export const colorTokensSchema = z.object(colorShape);
export type ColorTokens = Record<ColorToken, HexColor>;

export const colorOverridesSchema = colorTokensSchema.partial();
export type ColorOverrides = Partial<ColorTokens>;

export const COLOR_MODES = ["light", "dark"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/**
 * Curated Google Fonts with Arabic support. Font metadata (family name,
 * weights, role) lives in @nocido/theme and is checked against this list.
 */
export const FONT_IDS = [
  "amiri",
  "ibm-plex-sans-arabic",
  "noto-naskh-arabic",
  "noto-kufi-arabic",
  "readex-pro",
  "cairo",
  "tajawal",
  "almarai",
  "el-messiri",
  "reem-kufi",
  "changa",
  "lalezar",
] as const;
export type FontId = (typeof FONT_IDS)[number];
export const fontIdSchema = z.enum(FONT_IDS);

export const radiusSchema = z.object({
  /** Inputs, badges and small elements, in px. */
  base: z.number().int().min(0).max(32),
  /** Cards, sheets and images, in px. */
  card: z.number().int().min(0).max(48),
  /** Buttons: fully rounded pill or a px value. */
  button: z.union([z.literal("pill"), z.number().int().min(0).max(32)]),
});
export type ThemeRadius = z.infer<typeof radiusSchema>;

export const themeConfigSchema = z.object({
  presetId: themePresetIdSchema,
  overrides: z.object({
    light: colorOverridesSchema.default({}),
    dark: colorOverridesSchema.default({}),
  }),
  radius: radiusSchema,
  fonts: z.object({
    display: fontIdSchema,
    body: fontIdSchema,
  }),
  defaultMode: z.enum(THEME_MODES),
});
export type ThemeConfig = z.infer<typeof themeConfigSchema>;
