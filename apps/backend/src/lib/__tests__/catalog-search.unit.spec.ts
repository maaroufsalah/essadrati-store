import { type CatalogFacet, listParam, parseCatalogQuery } from "@nocido/types";
import { describe, expect, it } from "vitest";
import { type CatalogEntry, compareOptionValues, searchCatalog } from "../catalog-search";

const facets: CatalogFacet[] = [
  { id: "price", kind: "price", enabled: true, label: {} },
  { id: "poids", kind: "option", option: "الوزن", enabled: true, label: {} },
  { id: "category", kind: "category", enabled: true, label: {} },
  { id: "promo", kind: "promo", enabled: true, label: {} },
  { id: "availability", kind: "availability", enabled: true, label: {} },
];

function entry(id: string, overrides: Partial<CatalogEntry> = {}): CatalogEntry {
  return {
    id,
    createdAt: 0,
    featured: false,
    position: 0,
    categories: ["miel"],
    collection: null,
    options: { الوزن: ["500g"] },
    prices: [100],
    onSale: false,
    inStock: true,
    sales: 0,
    ...overrides,
  };
}

const catalog: CatalogEntry[] = [
  entry("ferrane", {
    position: 0,
    prices: [180, 340],
    options: { الوزن: ["500g", "1kg"] },
    sales: 9,
  }),
  entry("daghmous", { position: 1, prices: [150], onSale: true, createdAt: 30 }),
  entry("argan", {
    position: 2,
    categories: ["argan"],
    prices: [220],
    options: { الوزن: ["250ml"] },
    inStock: false,
    featured: true,
  }),
  entry("amlou", {
    position: 3,
    categories: ["amlou"],
    prices: [90],
    options: { الوزن: ["250g"] },
  }),
];

const query = (raw: Record<string, string>) => parseCatalogQuery(raw, facets);

describe("catalog query", () => {
  it("reads facets, prices, sort and page from the URL", () => {
    expect(
      query({ poids: "500g,1kg", min: "300", max: "100", sort: "price_desc", page: "2" }),
    ).toEqual({
      selected: { poids: ["500g", "1kg"] },
      min: 100,
      max: 300,
      q: null,
      sort: "price_desc",
      page: 2,
    });
  });

  it("ignores invalid values", () => {
    expect(query({ min: "-5", max: "abc", sort: "random", page: "0" })).toEqual({
      selected: {},
      min: null,
      max: null,
      q: null,
      sort: "relevance",
      page: 1,
    });
    expect(listParam(["a,b", " a ", ""])).toEqual(["a", "b"]);
  });
});

describe("catalog search", () => {
  it("combines facets with AND and values with OR", () => {
    const result = searchCatalog(catalog, {
      query: query({ poids: "500g,250g", category: "miel,amlou" }),
      facets,
    });
    expect(result.ids.sort()).toEqual(["amlou", "daghmous", "ferrane"]);
    const onlyPromo = searchCatalog(catalog, { query: query({ promo: "on_sale" }), facets });
    expect(onlyPromo.ids).toEqual(["daghmous"]);
  });

  it("keeps a product when any variant price is in range", () => {
    const result = searchCatalog(catalog, { query: query({ min: "300", max: "400" }), facets });
    expect(result.ids).toEqual(["ferrane"]);
    // The price range ignores the price filter itself.
    expect(result.priceRange).toEqual({ min: 90, max: 340 });
  });

  it("checks the price on the variant of the selected option", () => {
    const withVariants = catalog.map((item) =>
      item.id === "ferrane"
        ? {
            ...item,
            variants: [
              { price: 180, options: { الوزن: "500g" } },
              { price: 340, options: { الوزن: "1kg" } },
            ],
          }
        : item,
    );
    const cheap1kg = searchCatalog(withVariants, {
      query: query({ poids: "1kg", max: "300" }),
      facets,
    });
    expect(cheap1kg.ids).toEqual([]);
    const any = searchCatalog(withVariants, { query: query({ max: "300" }), facets });
    expect(any.ids).toContain("ferrane");
  });

  it("counts each facet with the other filters only", () => {
    const result = searchCatalog(catalog, { query: query({ category: "miel" }), facets });
    const counts = (id: string) =>
      Object.fromEntries(
        result.facets.find((facet) => facet.id === id)?.values.map((v) => [v.value, v.count]) ?? [],
      );
    // Categories still show every option, counted without the category filter.
    expect(counts("category")).toEqual({ miel: 2, argan: 1, amlou: 1 });
    // Weights are counted inside the selected category; unknown ones stay at 0.
    expect(counts("poids")).toEqual({ "250g": 0, "500g": 2, "1kg": 1, "250ml": 0 });
    expect(counts("availability")).toEqual({ in_stock: 2 });
  });

  it("orders weights naturally", () => {
    expect(["1kg", "250ml", "500g", "250g", "coffret"].sort(compareOptionValues)).toEqual([
      "250g",
      "250ml",
      "500g",
      "1kg",
      "coffret",
    ]);
  });

  it("sorts by relevance, price, novelty and sales", () => {
    const ids = (sort: string) => searchCatalog(catalog, { query: query({ sort }), facets }).ids;
    expect(ids("relevance")).toEqual(["argan", "ferrane", "daghmous", "amlou"]);
    expect(ids("price_asc")).toEqual(["amlou", "daghmous", "ferrane", "argan"]);
    expect(ids("price_desc")).toEqual(["argan", "ferrane", "daghmous", "amlou"]);
    expect(ids("newest")[0]).toBe("daghmous");
    expect(ids("bestsellers")[0]).toBe("ferrane");
  });

  it("scopes to a category and paginates", () => {
    const scoped = searchCatalog(catalog, {
      query: query({}),
      facets,
      scope: { category: "miel" },
    });
    expect(scoped.total).toBe(2);
    const paged = searchCatalog(catalog, { query: query({ page: "9" }), facets, pageSize: 3 });
    expect(paged).toMatchObject({ page: 2, pageCount: 2, total: 4 });
    expect(paged.ids).toHaveLength(1);
  });
});
