import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  catalogSettingsSchema,
  clearCatalogFilters,
  isFiltered,
  parseCatalogQuery,
  toCatalogSearchParams,
  toggleFacetValue,
} from "../index";

const facets = [
  { id: "price", kind: "price" as const },
  { id: "poids", kind: "option" as const },
  { id: "category", kind: "category" as const },
];

describe("catalog URL state", () => {
  it("round-trips through the URL, defaults left out", () => {
    const query = parseCatalogQuery(
      { category: "miel", poids: ["500g", "1kg"], min: "100", sort: "newest", page: "3" },
      facets,
    );
    expect(toCatalogSearchParams(query, facets).toString()).toBe(
      "poids=500g%2C1kg&category=miel&min=100&sort=newest&page=3",
    );
    expect(toCatalogSearchParams(parseCatalogQuery({}, facets), facets).toString()).toBe("");
  });

  it("toggles a value, resets the page and counts active filters", () => {
    const query = parseCatalogQuery({ poids: "500g", max: "300", page: "4" }, facets);
    const added = toggleFacetValue(query, "poids", "1kg");
    expect(added.selected.poids).toEqual(["500g", "1kg"]);
    expect(added.page).toBe(1);
    expect(activeFilterCount(added)).toBe(3);
    const removed = toggleFacetValue(toggleFacetValue(added, "poids", "1kg"), "poids", "500g");
    expect(removed.selected).toEqual({});
    expect(isFiltered(removed)).toBe(true);
    expect(isFiltered(clearCatalogFilters({ ...removed, sort: "price_asc" }))).toBe(false);
    expect(clearCatalogFilters({ ...removed, sort: "price_asc" }).sort).toBe("price_asc");
  });

  it("validates the admin facets", () => {
    const facet = { kind: "option", option: "الوزن", enabled: true, label: {} } as const;
    expect(catalogSettingsSchema.safeParse({ facets: [{ ...facet, id: "poids" }] }).success).toBe(
      true,
    );
    expect(catalogSettingsSchema.safeParse({ facets: [{ ...facet, id: "sort" }] }).success).toBe(
      false,
    );
    expect(catalogSettingsSchema.safeParse({ facets: [{ ...facet, id: "Poids!" }] }).success).toBe(
      false,
    );
    expect(
      catalogSettingsSchema.safeParse({
        facets: [
          { ...facet, id: "a" },
          { ...facet, id: "a" },
        ],
      }).success,
    ).toBe(false);
    expect(
      catalogSettingsSchema.safeParse({
        facets: [{ id: "x", kind: "option", enabled: true, label: {} }],
      }).success,
    ).toBe(false);
  });
});
