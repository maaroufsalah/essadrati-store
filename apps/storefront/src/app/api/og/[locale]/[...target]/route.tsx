import { generateTokensOrFallback } from "@nocido/theme";
import { DEFAULT_THEME_CONFIG } from "@nocido/theme/defaults";
import { isLocale, type Locale, resolveLocalized } from "@nocido/types";
import { ImageResponse } from "next/og";
import { getCategoryByHandle, getProductByHandle, listProductCards } from "@/lib/catalog";
import { formatPrice, storeFormat } from "@/lib/format";
import { routingFromSettings } from "@/lib/locale";
import { getPage } from "@/lib/pages";
import { toProductCardData } from "@/lib/product-view";
import { getStoreSettings } from "@/lib/settings";

export const revalidate = 3600;

const SIZE = { width: 1200, height: 630 };
/** The OG renderer (Satori) does not shape Arabic script: those cards use a Latin locale. */
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿ]/;

interface Card {
  title: string;
  subtitle: string;
  price: string | null;
  image: string | null;
}

async function cardFor(
  locale: Locale,
  kind: string,
  handle: string | undefined,
): Promise<Card | null> {
  const settings = await getStoreSettings();
  const fallbacks = [settings.localization.defaultLocale];
  const text = (value: Parameters<typeof resolveLocalized>[0]) =>
    resolveLocalized(value, locale, fallbacks);

  if (kind === "home") {
    return {
      title: text(settings.seo.metaTitle) || text(settings.identity.storeName),
      subtitle: text(settings.identity.tagline),
      price: null,
      image: settings.identity.logoLight?.url ?? null,
    };
  }
  if (!handle) return null;
  if (kind === "p") {
    const product = await getProductByHandle(locale, handle);
    if (!product) return null;
    const card = toProductCardData(product);
    return {
      title: card.title,
      subtitle: card.subtitle ?? "",
      price: card.price ? formatPrice(card.price.amount, storeFormat(settings, locale)) : null,
      image: card.thumbnail,
    };
  }
  if (kind === "c") {
    const category = await getCategoryByHandle(locale, handle);
    if (!category) return null;
    const [first] = await listProductCards(locale, { categoryId: [category.id], limit: 1 });
    return {
      title: category.name,
      subtitle: category.description ?? "",
      price: null,
      image: first?.thumbnail ?? null,
    };
  }
  if (kind === "page") {
    const page = await getPage(handle);
    if (!page) return null;
    return {
      title: text(page.title),
      subtitle: text(page.seo.metaDescription),
      price: null,
      image: null,
    };
  }
  return null;
}

/**
 * /api/og/<locale>/<home|p|c|page>/<handle>: 1200×630 link preview in the
 * theme colors, with the store name, the page title and, for a product,
 * its photo and price.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; target: string[] }> },
): Promise<Response> {
  const { locale, target } = await params;
  const [kind = "", handle] = target;
  const settings = await getStoreSettings();
  const { locales } = routingFromSettings(settings);
  if (!isLocale(locale) || !locales.includes(locale)) {
    return new Response("Not found", { status: 404 });
  }

  let card = await cardFor(locale, kind, handle);
  let cardLocale: Locale = locale;
  if (card && ARABIC.test(`${card.title}${card.subtitle}${card.price ?? ""}`)) {
    const latin = locales.find((code) => code !== "ar") ?? (locale === "ar" ? "fr" : locale);
    cardLocale = latin;
    card = await cardFor(latin, kind, handle);
  }
  if (!card) return new Response("Not found", { status: 404 });

  const colors = generateTokensOrFallback(settings.theme, DEFAULT_THEME_CONFIG).colors.light;
  const storeName = resolveLocalized(settings.identity.storeName, cardLocale, [
    settings.localization.defaultLocale,
  ]);
  const safe = (value: string) => (ARABIC.test(value) ? "" : value);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: colors.bg,
        color: colors.fg,
        padding: 64,
        gap: 56,
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 24 }}>
        <div style={{ display: "flex", fontSize: 30, color: colors.primary, fontWeight: 700 }}>
          {safe(storeName)}
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>
          {safe(card.title).slice(0, 90)}
        </div>
        {card.subtitle ? (
          <div style={{ display: "flex", fontSize: 30, color: colors.mutedFg, lineHeight: 1.3 }}>
            {safe(card.subtitle).slice(0, 140)}
          </div>
        ) : null}
        {card.price ? (
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginTop: 12,
              padding: "12px 28px",
              borderRadius: 999,
              backgroundColor: colors.primary,
              color: colors.primaryFg,
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            {safe(card.price)}
          </div>
        ) : null}
      </div>
      {card.image ? (
        <div
          style={{
            display: "flex",
            width: 440,
            height: 440,
            borderRadius: 32,
            overflow: "hidden",
            backgroundColor: colors.muted,
            border: `4px solid ${colors.accent}`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser */}
          <img src={card.image} alt="" width={440} height={440} style={{ objectFit: "cover" }} />
        </div>
      ) : null}
    </div>,
    { ...SIZE, headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
