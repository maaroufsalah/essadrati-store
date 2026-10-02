/*
 * Locale constants and helpers without zod, safe for client bundles
 * (@nocido/types/client). locale.ts adds the schemas.
 */

/** Every locale the kit supports. The first one is the kit default. */
export const LOCALES = ["ar", "fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** Locales written right to left. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function directionOf(locale: Locale): "rtl" | "ltr" {
  return RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
}

/**
 * A text value with one entry per locale. Every entry is optional so a store
 * can enable a locale before every text is translated.
 */
export type LocalizedString = Partial<Record<Locale, string>>;

/**
 * Returns the text for `locale`, then for each fallback in order, then the
 * first non-empty entry. Returns an empty string when nothing is set.
 */
export function resolveLocalized(
  value: LocalizedString | null | undefined,
  locale: Locale,
  fallbacks: readonly Locale[] = [],
): string {
  if (!value) return "";
  for (const candidate of [locale, ...fallbacks]) {
    const text = value[candidate];
    if (text) return text;
  }
  for (const candidate of LOCALES) {
    const text = value[candidate];
    if (text) return text;
  }
  return "";
}

/**
 * Medusa stores locales as BCP 47 tags (`x-medusa-locale` header). The kit
 * derives them from the store country, e.g. ("ar", "MA") -> "ar-MA".
 */
export function toMedusaLocale(locale: Locale, country: string): string {
  return `${locale}-${country.trim().toUpperCase()}`;
}

/** "ar-MA" -> "ar". Returns null for a language the kit does not support. */
export function fromMedusaLocale(code: string): Locale | null {
  const language = code.split("-")[0]?.toLowerCase();
  return isLocale(language) ? language : null;
}
