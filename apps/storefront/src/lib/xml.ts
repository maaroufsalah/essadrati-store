/** XML text and attribute escaping. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SitemapEntry {
  /** Absolute URL of this locale's version. */
  loc: string;
  lastmod?: string | null;
  /** hreflang -> absolute URL, including this one and "x-default". */
  alternates: Record<string, string>;
}

/** <urlset> with hreflang alternates (xhtml:link) for each URL. */
export function buildUrlset(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const links = Object.entries(entry.alternates)
        .map(
          ([lang, href]) =>
            `<xhtml:link rel="alternate" hreflang="${xmlEscape(lang)}" href="${xmlEscape(href)}"/>`,
        )
        .join("");
      const lastmod = entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : "";
      return `<url><loc>${xmlEscape(entry.loc)}</loc>${lastmod}${links}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

/** <sitemapindex> pointing to one sitemap per locale. */
export function buildSitemapIndex(locations: string[]): string {
  const items = locations
    .map((loc) => `<sitemap><loc>${xmlEscape(loc)}</loc></sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

export interface FeedItem {
  id: string;
  groupId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string | null;
  additionalImageLinks: string[];
  availability: "in_stock" | "out_of_stock";
  /** "300.00 MAD": regular price. */
  price: string;
  /** Discounted price, when lower than `price`. */
  salePrice: string | null;
  brand: string;
  productType: string | null;
}

/**
 * RSS 2.0 product feed with the Google Merchant namespace, accepted by
 * Google Merchant Center and Meta Commerce Manager.
 */
export function buildProductFeed(
  channel: { title: string; link: string; description: string },
  items: FeedItem[],
): string {
  const tag = (name: string, value: string | null) =>
    value ? `<g:${name}>${xmlEscape(value)}</g:${name}>` : "";
  const body = items
    .map((item) =>
      [
        "<item>",
        tag("id", item.id),
        tag("item_group_id", item.groupId),
        tag("title", item.title),
        tag("description", item.description),
        tag("link", item.link),
        tag("image_link", item.imageLink),
        ...item.additionalImageLinks.slice(0, 10).map((url) => tag("additional_image_link", url)),
        tag("availability", item.availability),
        tag("price", item.price),
        tag("sale_price", item.salePrice),
        tag("brand", item.brand),
        tag("condition", "new"),
        tag("product_type", item.productType),
        "</item>",
      ].join(""),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${xmlEscape(channel.title)}</title>
<link>${xmlEscape(channel.link)}</link>
<description>${xmlEscape(channel.description)}</description>
${body}
</channel>
</rss>
`;
}

/** 300 + "MAD" -> "300.00 MAD" (feed price format, always latin digits). */
export function feedPrice(amount: number, currency: string): string {
  return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
}

/** Markdown/HTML-ish text to a plain feed description (max 5000 chars). */
export function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>[\]()!]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}
