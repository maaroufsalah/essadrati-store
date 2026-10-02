import type { Locale } from "@nocido/types";
import type { Metadata } from "next";
import { publicEnv } from "./env";
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

/** Absolute URL on the public storefront origin (NEXT_PUBLIC_SITE_URL). */
export function siteUrl(path: string): string {
  return new URL(path, publicEnv.NEXT_PUBLIC_SITE_URL).toString();
}

/** hreflang map of absolute URLs for a path, for sitemaps. */
export function hreflangUrls(
  locales: readonly Locale[],
  defaultLocale: Locale,
  path: string,
): Record<string, string> {
  const suffix = path === "/" ? "" : path;
  return {
    ...Object.fromEntries(locales.map((code) => [code, siteUrl(`/${code}${suffix}`)])),
    "x-default": siteUrl(`/${defaultLocale}${suffix}`),
  };
}

export type OgKind = "home" | "p" | "c" | "page";

/** Generated Open Graph image of a page (route /api/og). */
export function ogImage(locale: Locale, kind: OgKind, handle?: string) {
  const path = handle
    ? `/api/og/${locale}/${kind}/${encodeURIComponent(handle)}`
    : `/api/og/${locale}/${kind}`;
  return { url: path, width: 1200, height: 630 };
}
