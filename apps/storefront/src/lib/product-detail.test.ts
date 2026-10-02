import { describe, expect, it } from "vitest";
import { productJsonLd, toProductDetail } from "./product-detail";

const product = {
  id: "prod_1",
  handle: "asal-ferrane",
  title: "Ferrane",
  subtitle: "Rare",
  description: "Honey",
  thumbnail: "http://x/a.svg",
  images: [{ url: "http://x/a.svg" }, { url: "http://x/b.jpg" }],
  metadata: { rating: 4.9, reviews_count: 128 },
  categories: [{ id: "pcat_1" }],
  variants: [
    {
      id: "v_1kg",
      title: "1kg",
      options: [{ value: "1kg" }],
      calculated_price: { calculated_amount: 560, original_amount: 850 },
    },
    {
      id: "v_500",
      title: "500g",
      options: [{ value: "500g" }],
      calculated_price: { calculated_amount: 300, original_amount: 450 },
    },
  ],
} as never;

describe("product detail", () => {
  it("deduplicates images and sorts variants by price", () => {
    const detail = toProductDetail(product);
    expect(detail.images).toEqual(["http://x/a.svg", "http://x/b.jpg"]);
    expect(detail.variants.map((variant) => variant.label)).toEqual(["500g", "1kg"]);
    expect(detail.variants[0]).toMatchObject({ amount: 300, original: 450 });
    expect(detail.categoryIds).toEqual(["pcat_1"]);
  });

  it("builds Product JSON-LD with one offer per variant", () => {
    const ld = productJsonLd(toProductDetail(product), {
      url: "https://shop.test/fr/p/asal-ferrane",
      currency: "MAD",
      brand: "Shop",
    });
    expect(ld).toMatchObject({
      "@type": "Product",
      name: "Ferrane",
      aggregateRating: { reviewCount: 128 },
    });
    expect(ld.offers).toHaveLength(2);
  });
});
