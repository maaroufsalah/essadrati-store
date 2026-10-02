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

/**
 * Catalog pages (category, all products): the canonical keeps only the
 * page number, filters and sorts are dropped; any filtered or re-sorted
 * combination is noindex (still followed), so only real listings rank.
 */
export async function catalogAlternates(
  locale: Locale,
  path: string,
  state: { page: number; filtered: boolean; sorted: boolean },
): Promise<Pick<Metadata, "alternates" | "robots">> {
  const alternates = await alternatesFor(locale, path);
  const page = state.page > 1 ? `?page=${state.page}` : "";
  return {
    alternates: { ...alternates, canonical: `/${locale}${path}${page}` },
    robots: state.filtered || state.sorted ? { index: false, follow: true } : undefined,
  };
}
