import { isLocale } from "@nocido/types";
import { listAllProducts, listCategories } from "@/lib/catalog";
import { routingFromSettings } from "@/lib/locale";
import { listPages } from "@/lib/pages";
import { hreflangUrls, siteUrl } from "@/lib/seo";
import { getStoreSettings } from "@/lib/settings";
import { buildUrlset, type SitemapEntry } from "@/lib/xml";

export const revalidate = 3600;

const iso = (value: unknown): string | null => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** /sitemaps/<locale>.xml: home, categories, products and CMS pages of one locale. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
): Promise<Response> {
  const { file } = await params;
  const locale = file.replace(/\.xml$/, "");
  const { locales, defaultLocale } = routingFromSettings(await getStoreSettings());
  if (!file.endsWith(".xml") || !isLocale(locale) || !locales.includes(locale)) {
    return new Response("Not found", { status: 404 });
  }

  const [categories, products, pages] = await Promise.all([
    listCategories(locale),
    listAllProducts(locale),
    listPages(),
  ]);
  const entry = (path: string, lastmod: string | null = null): SitemapEntry => ({
    loc: siteUrl(`/${locale}${path === "/" ? "" : path}`),
    lastmod,
    alternates: hreflangUrls(locales, defaultLocale, path),
  });

  const entries: SitemapEntry[] = [
    entry("/"),
    ...categories.map((category) => entry(`/c/${category.handle}`, iso(category.updated_at))),
    ...products.map((product) => entry(`/p/${product.handle}`, iso(product.updated_at))),
    ...pages.map((page) => entry(`/${page.handle}`, iso(page.updatedAt))),
  ];
  return new Response(buildUrlset(entries), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
