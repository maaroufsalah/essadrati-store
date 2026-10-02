import { isLocale, resolveLocalized } from "@nocido/types";
import { listAllProducts } from "@/lib/catalog";
import { routingFromSettings } from "@/lib/locale";
import { variantPrice } from "@/lib/product-view";
import { siteUrl } from "@/lib/seo";
import { getStoreSettings } from "@/lib/settings";
import { buildProductFeed, type FeedItem, feedPrice, plainText } from "@/lib/xml";

export const revalidate = 3600;

const FEEDS = new Set(["meta.xml", "google.xml"]);

/**
 * /feeds/<locale>/meta.xml and /feeds/<locale>/google.xml: one item per
 * priced variant, ids equal to the tracking content ids (variant ids).
 * Both channels read the same Google Merchant RSS format.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; file: string }> },
): Promise<Response> {
  const { locale, file } = await params;
  const settings = await getStoreSettings();
  const { locales, defaultLocale } = routingFromSettings(settings);
  if (!FEEDS.has(file) || !isLocale(locale) || !locales.includes(locale)) {
    return new Response("Not found", { status: 404 });
  }

  const fallbacks = [defaultLocale];
  const storeName = resolveLocalized(settings.identity.storeName, locale, fallbacks);
  const currency = settings.localization.defaultCurrency;
  const products = await listAllProducts(locale);

  const items: FeedItem[] = products.flatMap((product) => {
    const images = (product.images ?? []).map((image) => image.url).filter(Boolean);
    const imageLink = product.thumbnail ?? images[0] ?? null;
    // First non-empty text: description, subtitle, then title.
    const description = plainText(
      [product.description, product.subtitle].find((value) => value?.trim()) ?? product.title,
    );
    const categoryPath = (product.categories ?? []).map((category) => category.name).join(" > ");
    const productType = categoryPath === "" ? null : categoryPath;
    return (product.variants ?? []).flatMap((variant): FeedItem[] => {
      const price = variantPrice(variant);
      if (!price) return [];
      const outOfStock =
        variant.manage_inventory === true &&
        variant.allow_backorder !== true &&
        (variant.inventory_quantity ?? 0) <= 0;
      const multiple = (product.variants?.length ?? 0) > 1;
      return [
        {
          id: variant.id,
          groupId: product.id,
          title: multiple && variant.title ? `${product.title} - ${variant.title}` : product.title,
          description,
          link: siteUrl(`/${locale}/p/${product.handle}`),
          imageLink,
          additionalImageLinks: images.filter((url) => url !== imageLink),
          availability: outOfStock ? "out_of_stock" : "in_stock",
          price: feedPrice(price.original ?? price.amount, currency),
          salePrice: price.original ? feedPrice(price.amount, currency) : null,
          brand: storeName,
          productType,
        },
      ];
    });
  });

  const xml = buildProductFeed(
    {
      title: storeName,
      link: siteUrl(`/${locale}`),
      description: resolveLocalized(settings.seo.metaDescription, locale, fallbacks) || storeName,
    },
    items,
  );
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
