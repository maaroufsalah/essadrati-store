import { describe, expect, it } from "vitest";
import {
  buildProductFeed,
  buildSitemapIndex,
  buildUrlset,
  feedPrice,
  plainText,
  xmlEscape,
} from "./xml";

describe("xml builders", () => {
  it("escapes text", () => {
    expect(xmlEscape(`Miel & "amlou" <bio>`)).toBe("Miel &amp; &quot;amlou&quot; &lt;bio&gt;");
  });

  it("lists hreflang alternates in the urlset", () => {
    const xml = buildUrlset([
      {
        loc: "https://shop.test/fr/p/miel",
        lastmod: "2026-10-01T10:00:00.000Z",
        alternates: {
          ar: "https://shop.test/ar/p/miel",
          fr: "https://shop.test/fr/p/miel",
          "x-default": "https://shop.test/ar/p/miel",
        },
      },
    ]);
    expect(xml).toContain("<loc>https://shop.test/fr/p/miel</loc>");
    expect(xml).toContain('hreflang="x-default" href="https://shop.test/ar/p/miel"');
    expect(xml).toContain("<lastmod>2026-10-01T10:00:00.000Z</lastmod>");
  });

  it("indexes the locale sitemaps", () => {
    expect(buildSitemapIndex(["https://shop.test/sitemaps/fr.xml"])).toContain(
      "<sitemap><loc>https://shop.test/sitemaps/fr.xml</loc></sitemap>",
    );
  });

  it("builds a Merchant feed item with sale price", () => {
    const xml = buildProductFeed(
      { title: "Shop", link: "https://shop.test/fr", description: "Feed" },
      [
        {
          id: "variant_1",
          groupId: "prod_1",
          title: "Miel - 500g",
          description: "Miel pur",
          link: "https://shop.test/fr/p/miel",
          imageLink: "https://cdn.test/miel.jpg",
          additionalImageLinks: [],
          availability: "in_stock",
          price: feedPrice(350, "mad"),
          salePrice: feedPrice(300, "mad"),
          brand: "Shop",
          productType: "Miels",
        },
      ],
    );
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<g:price>350.00 MAD</g:price>");
    expect(xml).toContain("<g:sale_price>300.00 MAD</g:sale_price>");
    expect(xml).toContain("<g:condition>new</g:condition>");
  });

  it("strips markup from descriptions", () => {
    expect(plainText("## Titre\n\n**Miel** <b>pur</b>")).toBe("Titre Miel pur");
  });
});
