import { describe, expect, it } from "vitest";
import {
  breadcrumbJsonLd,
  faqEntries,
  faqJsonLd,
  itemListJsonLd,
  serializeJsonLd,
  websiteJsonLd,
} from "./json-ld";

describe("JSON-LD", () => {
  it("numbers breadcrumb items and leaves the current page without URL", () => {
    const data = breadcrumbJsonLd([
      { name: "Accueil", url: "https://shop.ma/fr" },
      { name: "Miel" },
    ]);
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://shop.ma/fr" },
      { "@type": "ListItem", position: 2, name: "Miel" },
    ]);
  });

  it("points the site search to the catalog", () => {
    const data = websiteJsonLd({
      name: "Shop",
      url: "https://shop.ma/fr",
      locale: "fr",
      searchUrl: "https://shop.ma/fr/products",
    });
    expect(data.potentialAction).toMatchObject({
      target: { urlTemplate: "https://shop.ma/fr/products?q={search_term_string}" },
    });
  });

  it("continues item positions across pages", () => {
    const data = itemListJsonLd([{ name: "A", url: "https://shop.ma/fr/p/a" }], 13);
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 13, name: "A", url: "https://shop.ma/fr/p/a" },
    ]);
  });

  it("reads questions and answers from Markdown", () => {
    const markdown = [
      "Intro",
      "### Comment payer ?",
      "",
      "En **espèces** à la [livraison](/fr/livraison).",
      "## Nos engagements",
      "Texte.",
      "## Quels délais ?",
      "Un à trois jours.",
    ].join("\n");
    const entries = faqEntries(markdown);
    expect(entries).toEqual([
      { question: "Comment payer ?", answer: "En espèces à la livraison." },
      { question: "Quels délais ?", answer: "Un à trois jours." },
    ]);
    expect(faqJsonLd(entries).mainEntity).toHaveLength(2);
  });

  it("escapes markup in the script content", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).not.toContain("</script>");
  });
});
