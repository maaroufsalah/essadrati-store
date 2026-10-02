import type { Locale } from "@nocido/types";
import type { Metadata } from "next";
import { routingFromSettings } from "./locale";
import { getStoreSettings } from "./settings";

/**
 * canonical and hreflang alternates for a path that exists in every enabled
 * locale, e.g. alternatesFor("fr", "/c/honey").
 */
export async function alternatesFor(locale: Locale, path: string): Promise<Metadata["alternates"]> {
  const settings = await getStoreSettings();
  const { locales, defaultLocale } = routingFromSettings(settings);
  const suffix = path === "/" ? "" : path;
  return {
    canonical: `/${locale}${suffix}`,
    languages: {
      ...Object.fromEntries(locales.map((code) => [code, `/${code}${suffix}`])),
      "x-default": `/${defaultLocale}${suffix}`,
    },
  };
}
