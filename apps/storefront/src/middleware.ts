import { createStoreClient, KIT_ROUTES } from "@nocido/api-client";
import { DEFAULT_PUBLIC_STORE_SETTINGS } from "@nocido/theme/defaults";
import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { nonEmpty } from "./lib/env";
import { type LocaleRouting, redirectForDisabledLocale, routingFromSettings } from "./lib/locale";
import { redirectTarget } from "./lib/redirects";

/**
 * Locale routing driven by StoreSettings: enabled locales and default locale
 * are read from the backend and kept in memory for one minute (the
 * middleware does not share the Next.js data cache).
 */
const CACHE_MS = 60_000;
let cached: { routing: LocaleRouting; expires: number } | null = null;

async function storeRouting(): Promise<LocaleRouting> {
  if (cached && cached.expires > Date.now()) return cached.routing;

  const baseUrl =
    nonEmpty(process.env.MEDUSA_INTERNAL_URL) ??
    nonEmpty(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL);
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";
  const result = baseUrl
    ? await createStoreClient({
        baseUrl,
        publishableKey,
        settingsFallback: DEFAULT_PUBLIC_STORE_SETTINGS,
      }).getStoreSettings({ cache: "no-store" })
    : null;

  const resolved = routingFromSettings(result?.ok ? result.data : DEFAULT_PUBLIC_STORE_SETTINGS);
  // Failures are cached briefly too, so a down backend is not hammered.
  cached = { routing: resolved, expires: Date.now() + (result?.ok ? CACHE_MS : CACHE_MS / 6) };
  return resolved;
}

let redirects: { map: Map<string, string>; expires: number } | null = null;

/** Permanent redirects (renamed handles), kept one minute like the routing. */
async function redirectMap(): Promise<Map<string, string>> {
  if (redirects && redirects.expires > Date.now()) return redirects.map;
  const baseUrl =
    nonEmpty(process.env.MEDUSA_INTERNAL_URL) ??
    nonEmpty(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL);
  let map = redirects?.map ?? new Map<string, string>();
  let ok = false;
  if (baseUrl) {
    try {
      const response = await fetch(new URL(KIT_ROUTES.redirects, baseUrl), {
        headers: { "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "" },
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        const body = (await response.json()) as { redirects?: { from: string; to: string }[] };
        map = new Map((body.redirects ?? []).map((row) => [row.from, row.to]));
        ok = true;
      }
    } catch {
      // Keep the previous map; retried soon.
    }
  }
  redirects = { map, expires: Date.now() + (ok ? CACHE_MS : CACHE_MS / 6) };
  return map;
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const storeLocales = await storeRouting();

  // Renamed product, category or page handles: 301 to the current URL.
  const moved = redirectTarget(request.nextUrl.pathname, await redirectMap());
  if (moved) {
    const url = request.nextUrl.clone();
    url.pathname = moved;
    return NextResponse.redirect(url, 301);
  }

  const target = redirectForDisabledLocale(request.nextUrl.pathname, storeLocales);
  if (target) {
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }

  return createMiddleware({
    ...routing,
    locales: storeLocales.locales,
    defaultLocale: storeLocales.defaultLocale,
  })(request);
}

export const config = {
  runtime: "nodejs",
  // Everything except API routes, Next internals and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
