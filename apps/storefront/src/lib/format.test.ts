import { describe, expect, it } from "vitest";
import { discountPercent, formatNumber, formatPrice, type StoreFormat } from "./format";
import { toProductCardData } from "./product-view";

const fr: StoreFormat = { locale: "fr", currency: "MAD", numberingSystem: "latn" };
const ar: StoreFormat = { locale: "ar", currency: "MAD", numberingSystem: "latn" };
const arab: StoreFormat = { locale: "ar", currency: "MAD", numberingSystem: "arab" };

describe("formatPrice", () => {
  it("formats MAD without decimals for whole amounts", () => {
    expect(formatPrice(300, fr)).toMatch(/^300\s?MAD$/);
    expect(formatPrice(12.5, fr)).toMatch(/12,50/);
  });

  it("follows the store digits in Arabic", () => {
    expect(formatPrice(300, ar)).toContain("300");
    expect(formatPrice(300, arab)).toContain("٣٠٠");
    expect(formatNumber(1250, arab)).not.toMatch(/[0-9]/);
  });
});

describe("discountPercent", () => {
  it("rounds and ignores non-discounts", () => {
    expect(discountPercent(300, 450)).toBe(33);
    expect(discountPercent(300, 300)).toBeNull();
    expect(discountPercent(300, null)).toBeNull();
  });
});

describe("toProductCardData", () => {
  const variant = (id: string, amount: number, original?: number) =>
    ({
      id,
      calculated_price: { calculated_amount: amount, original_amount: original ?? amount },
    }) as never;

  it("uses the cheapest variant and keeps the regular price when discounted", () => {
    const card = toProductCardData({
      id: "prod_1",
      handle: "asal-ferrane",
      title: "Ferrane",
      subtitle: null,
      thumbnail: "http://x/a.svg",
      metadata: { rating: 4.9, reviews_count: 128, featured: true },
      variants: [variant("v2", 560, 850), variant("v1", 300, 450)],
    } as never);
    expect(card).toMatchObject({
      price: { amount: 300, original: 450 },
      priceVaries: true,
      rating: 4.9,
      reviewsCount: 128,
      featured: true,
      defaultVariantId: "v1",
    });
  });

  it("tolerates products without prices or metadata", () => {
    const card = toProductCardData({ id: "p", handle: "h", title: "T", variants: [] } as never);
    expect(card.price).toBeNull();
    expect(card.rating).toBeNull();
    expect(card.featured).toBe(false);
  });
});
