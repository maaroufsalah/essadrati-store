import { describe, expect, it } from "vitest";
import {
  applyFilters,
  availableValues,
  type CatalogItem,
  paginate,
  parseFilters,
  priceBounds,
  toSearchParams,
} from "./category";

const item = (
  id: string,
  prices: number[],
  values: string[],
  extra: Partial<CatalogItem> = {},
): CatalogItem => ({
  card: {
    id,
    handle: id,
    title: id,
    subtitle: null,
    thumbnail: null,
    price: { amount: Math.min(...prices), original: null },
    priceVaries: prices.length > 1,
    rating: null,
    reviewsCount: 0,
    featured: false,
    defaultVariantId: null,
    variantCount: prices.length,
  },
  values,
  prices,
  createdAt: 0,
  position: 0,
  ...extra,
});

const items = [
  item("ferrane", [300, 560], ["500g", "1kg"], { position: 0 }),
  item("eucalyptus", [120, 220], ["500g", "1kg"], { position: 1, createdAt: 10 }),
  item("amlou", [90, 170], ["250g", "500g"], { position: 2 }),
  item("argan", [180, 330], ["250ml", "500ml"], {
    position: 3,
    card: { ...item("argan", [180], []).card, featured: true },
  }),
];

describe("category filters", () => {
  it("parses URL state and ignores garbage", () => {
    expect(
      parseFilters({ min: "100", max: "x", w: "500g,1kg", sort: "price_desc", page: "2" }),
    ).toEqual({
      min: 100,
      max: null,
      values: ["500g", "1kg"],
      sort: "price_desc",
      page: 2,
    });
    expect(parseFilters({ sort: "nope", page: "-3" })).toMatchObject({ sort: "featured", page: 1 });
  });

  it("round-trips through search params, omitting defaults", () => {
    const params = toSearchParams({
      min: 100,
      max: null,
      values: ["1kg"],
      sort: "featured",
      page: 1,
    });
    expect(params.toString()).toBe("min=100&w=1kg");
  });

  it("filters by option value and by any variant price in range", () => {
    const byWeight = applyFilters(items, { ...parseFilters({}), values: ["1kg"] });
    expect(byWeight.map((entry) => entry.card.id)).toEqual(["ferrane", "eucalyptus"]);
    const byPrice = applyFilters(items, { ...parseFilters({}), min: 200, max: 250 });
    expect(byPrice.map((entry) => entry.card.id)).toEqual(["eucalyptus"]);
  });

  it("sorts by price, newest and featured first", () => {
    const base = parseFilters({});
    expect(
      applyFilters(items, { ...base, sort: "price_asc" }).map((entry) => entry.card.id)[0],
    ).toBe("amlou");
    expect(
      applyFilters(items, { ...base, sort: "price_desc" }).map((entry) => entry.card.id)[0],
    ).toBe("ferrane");
    expect(applyFilters(items, { ...base, sort: "newest" })[0]?.card.id).toBe("eucalyptus");
    expect(applyFilters(items, base)[0]?.card.id).toBe("argan");
  });

  it("paginates and clamps the page", () => {
    const pages = paginate([1, 2, 3, 4, 5], 9, 2);
    expect(pages).toEqual({ items: [5], page: 3, pageCount: 3 });
  });

  it("lists values in a natural weight order and computes bounds", () => {
    expect(availableValues(items)).toEqual(["250g", "250ml", "500g", "500ml", "1kg"]);
    expect(availableValues([item("box", [500], ["1"])])).toEqual([]);
    expect(priceBounds(items)).toEqual({ min: 90, max: 560 });
  });
});
