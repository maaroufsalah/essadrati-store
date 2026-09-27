import {
  COLOR_MODES,
  COLOR_TOKENS,
  type ColorMode,
  type ColorToken,
  type ColorTokens,
  type ThemeConfig,
  themeConfigSchema,
} from "@nocido/types";
import { checkContrast, type ContrastIssue } from "./contrast";
import { expoFontName, fontStack } from "./fonts";
import { getPreset } from "./presets";

/** cardFg -> --color-card-fg */
export function colorVarName(token: ColorToken): string {
  return `--color-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
}

/** CSS property name to value, e.g. { "--color-bg": "#F7F1E6" }. */
export type CssVars = Record<string, string>;

export interface ThemeTokens {
  /** Merged colors per mode: preset values, then overrides. */
  colors: Record<ColorMode, ColorTokens>;
  /** CSS custom properties per mode. Radius and fonts are in `light` only (they apply to :root). */
  cssVars: Record<ColorMode, CssVars>;
  /** Stylesheet to inject server-side, unlayered: `:root{...}.dark{...}`. */
  css: string;
  /** Values for the Expo app (NativeWind `vars()` and plain style objects). */
  native: {
    vars: Record<ColorMode, CssVars>;
    colors: Record<ColorMode, ColorTokens>;
    radius: { base: number; card: number; button: number };
    fonts: {
      display: { regular: string; bold: string };
      body: { regular: string; medium: string; bold: string };
    };
  };
}

export type GenerateTokensResult =
  { ok: true; tokens: ThemeTokens } | { ok: false; issues: ContrastIssue[] };

/** Pill buttons use a radius larger than any button height. */
export const PILL_RADIUS = 9999;

/** Preset colors for a mode, with the config overrides applied. */
export function resolveColors(config: ThemeConfig, mode: ColorMode): ColorTokens {
  return { ...getPreset(config.presetId)[mode], ...config.overrides[mode] };
}

function toCssBlock(selector: string, vars: CssVars): string {
  const body = Object.entries(vars)
    .map(([name, value]) => `${name}:${value}`)
    .join(";");
  return `${selector}{${body}}`;
}

function buildTokens(config: ThemeConfig, colors: Record<ColorMode, ColorTokens>): ThemeTokens {
  const buttonRadius = config.radius.button === "pill" ? PILL_RADIUS : config.radius.button;

  const colorVars = (mode: ColorMode): CssVars =>
    Object.fromEntries(COLOR_TOKENS.map((token) => [colorVarName(token), colors[mode][token]]));

  const sharedVars: CssVars = {
    "--radius": `${config.radius.base}px`,
    "--radius-base": `${config.radius.base}px`,
    "--radius-card": `${config.radius.card}px`,
    "--radius-button": `${buttonRadius}px`,
    "--font-display": fontStack(config.fonts.display),
    "--font-body": fontStack(config.fonts.body),
  };

  const cssVars: Record<ColorMode, CssVars> = {
    light: { ...colorVars("light"), ...sharedVars, "color-scheme": "light" },
    dark: { ...colorVars("dark"), "color-scheme": "dark" },
  };

  const css = toCssBlock(":root", cssVars.light) + toCssBlock(".dark", cssVars.dark);

  return {
    colors,
    cssVars,
    css,
    native: {
      vars: { light: colorVars("light"), dark: colorVars("dark") },
      colors,
      radius: { base: config.radius.base, card: config.radius.card, button: buttonRadius },
      fonts: {
        display: {
          regular: expoFontName(config.fonts.display, 400),
          bold: expoFontName(config.fonts.display, 700),
        },
        body: {
          regular: expoFontName(config.fonts.body, 400),
          medium: expoFontName(config.fonts.body, 500),
          bold: expoFontName(config.fonts.body, 700),
        },
      },
    },
  };
}

/**
 * Merges the preset and the overrides, then refuses the theme if any
 * text/background pair falls under WCAG AA (4.5:1, or 3:1 for the focus ring).
 * The config is re-validated, so the CSS output only ever contains validated
 * hex colors, integers and known font stacks.
 */
export function generateTokens(input: unknown): GenerateTokensResult {
  const config = themeConfigSchema.parse(input);
  const colors = {
    light: resolveColors(config, "light"),
    dark: resolveColors(config, "dark"),
  };
  const issues = COLOR_MODES.flatMap((mode) => checkContrast(colors[mode], mode));
  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, tokens: buildTokens(config, colors) };
}

/**
 * For rendering: never fails. When the stored config is invalid or its
 * overrides break contrast, the overrides are dropped and the preset is used.
 * When the config itself cannot be parsed, `fallback` is used.
 */
export function generateTokensOrFallback(input: unknown, fallback: ThemeConfig): ThemeTokens {
  const parsed = themeConfigSchema.safeParse(input);
  const config = parsed.success ? parsed.data : fallback;
  const result = generateTokens(config);
  if (result.ok) return result.tokens;
  const presetOnly: ThemeConfig = { ...config, overrides: { light: {}, dark: {} } };
  const colors = {
    light: resolveColors(presetOnly, "light"),
    dark: resolveColors(presetOnly, "dark"),
  };
  return buildTokens(presetOnly, colors);
}
