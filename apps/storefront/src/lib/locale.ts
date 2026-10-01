import { isLocale, type Locale, LOCALES, type PublicStoreSettings } from "@nocido/types";

export interface LocaleRouting {
  /** Enabled locales, in the kit order. */
  locales: Locale[];
  defaultLocale: Locale;
}

/** Locales the storefront serves, from StoreSettings.localization. */
export function routingFromSettings(
  settings: Pick<PublicStoreSettings, "localization">,
): LocaleRouting {
  const { enabledLocales, defaultLocale } = settings.localization;
  const locales = LOCALES.filter((locale) => enabledLocales.includes(locale));
  if (locales.length === 0) return { locales: [defaultLocale], defaultLocale };
  return {
    locales,
    defaultLocale: locales.includes(defaultLocale) ? defaultLocale : (locales[0] ?? defaultLocale),
  };
}

/**
 * When the first path segment is a kit locale the store has disabled,
 * returns the same path under the default locale. Otherwise null.
 */
export function redirectForDisabledLocale(pathname: string, routing: LocaleRouting): string | null {
  const [, first, ...rest] = pathname.split("/");
  if (!isLocale(first) || routing.locales.includes(first)) return null;
  return `/${[routing.defaultLocale, ...rest].join("/")}`.replace(/\/$/, "") || "/";
}
