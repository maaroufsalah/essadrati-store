import { routingFromSettings } from "@/lib/locale";
import { siteUrl } from "@/lib/seo";
import { getStoreSettings } from "@/lib/settings";
import { buildSitemapIndex } from "@/lib/xml";

export const revalidate = 3600;

/** Sitemap index: one sitemap per enabled locale (/sitemaps/<locale>.xml). */
export async function GET(): Promise<Response> {
  const { locales } = routingFromSettings(await getStoreSettings());
  return new Response(
    buildSitemapIndex(locales.map((locale) => siteUrl(`/sitemaps/${locale}.xml`))),
    {
      headers: { "content-type": "application/xml; charset=utf-8" },
    },
  );
}
