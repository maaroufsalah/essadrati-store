import {
  CATALOG_PAGE_SIZE,
  type CatalogFacet,
  type CatalogQuery,
  type CatalogSearchResult,
  type CatalogSort,
  type FacetResult,
  IN_STOCK,
  ON_SALE,
} from "@nocido/types";

/** What the search needs to know about one product (built by catalog-index). */
export interface CatalogEntry {
  id: string;
  createdAt: number;
  featured: boolean;
  /** Catalog order: featured products, then this, for the "relevance" sort. */
  position: number;
  categories: string[];
  collection: string | null;
  /** Option title -> values offered by the variants. */
  options: Record<string, string[]>;
  /** Calculated price of every variant, in major units. */
  prices: number[];
  /**
   * Price and option values of each variant, so a price filter combined
   * with an option filter checks the same variant (1kg under 300 MAD).
   * Without it, any variant price counts.
   */
  variants?: { price: number | null; options: Record<string, string> }[];
  onSale: boolean;
  inStock: boolean;
  /** Units sold (orders not canceled). */
  sales: number;
}

export interface SearchInput {
  query: CatalogQuery;
  /** Enabled facets, in display order. */
  facets: readonly CatalogFacet[];
  /** Restricts the whole search (category page). */
  scope?: { category?: string };
  pageSize?: number;
}

/** Values an entry has for a facet (what a filter on it matches). */
export function entryValues(entry: CatalogEntry, facet: CatalogFacet): string[] {
  switch (facet.kind) {
    case "category":
      return entry.categories;
    case "collection":
      return entry.collection ? [entry.collection] : [];
    case "availability":
      return entry.inStock ? [IN_STOCK] : [];
    case "promo":
      return entry.onSale ? [ON_SALE] : [];
    case "option":
      return facet.option ? (entry.options[facet.option] ?? []) : [];
    case "price":
      return [];
  }
}

/**
 * Prices of the variants that satisfy the selected option filters (every
 * price when no option is selected); `skip` ignores one facet, as for the
 * facet counts.
 */
function candidatePrices(
  entry: CatalogEntry,
  query: CatalogQuery,
  facets: readonly CatalogFacet[],
  skip?: string,
): number[] {
  if (!entry.variants) return entry.prices;
  const optionFilters = facets.filter(
    (facet) => facet.kind === "option" && facet.id !== skip && query.selected[facet.id]?.length,
  );
  if (optionFilters.length === 0) return entry.prices;
  return entry.variants
    .filter((variant) =>
      optionFilters.every((facet) => {
        const value = facet.option ? variant.options[facet.option] : undefined;
        return value !== undefined && (query.selected[facet.id] ?? []).includes(value);
      }),
    )
    .flatMap((variant) => (variant.price === null ? [] : [variant.price]));
}

function inPriceRange(prices: number[], min: number | null, max: number | null): boolean {
  if (min === null && max === null) return true;
  return prices.some((price) => (min === null || price >= min) && (max === null || price <= max));
}

/** OR inside a facet, AND between facets; `skip` leaves one facet out (its own counts). */
function matches(
  entry: CatalogEntry,
  query: CatalogQuery,
  facets: readonly CatalogFacet[],
  skip?: string,
): boolean {
  if (
    skip !== "price" &&
    !inPriceRange(candidatePrices(entry, query, facets, skip), query.min, query.max)
  ) {
    return false;
  }
  for (const facet of facets) {
    if (facet.id === skip) continue;
    const selected = query.selected[facet.id];
    if (!selected?.length) continue;
    const values = entryValues(entry, facet);
    if (!values.some((value) => selected.includes(value))) return false;
  }
  return true;
}

const MEASURE = /^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|cl)$/i;

/** 250g < 500g < 1kg; other values after, alphabetically. */
export function compareOptionValues(a: string, b: string): number {
  const size = (value: string): number => {
    const match = MEASURE.exec(value.trim());
    if (!match) return Number.POSITIVE_INFINITY;
    const quantity = Number((match[1] ?? "0").replace(",", "."));
    const unit = (match[2] ?? "").toLowerCase();
    return unit === "kg" || unit === "l"
      ? quantity * 1000
      : unit === "cl"
        ? quantity * 10
        : quantity;
  };
  const difference = size(a) - size(b);
  return Number.isNaN(difference) || difference === 0 ? a.localeCompare(b) : difference;
}

const cheapest = (entry: CatalogEntry) =>
  entry.prices.length > 0 ? Math.min(...entry.prices) : Number.POSITIVE_INFINITY;

function relevance(a: CatalogEntry, b: CatalogEntry): number {
  return Number(b.featured) - Number(a.featured) || a.position - b.position;
}

export function sortEntries(entries: CatalogEntry[], sort: CatalogSort): CatalogEntry[] {
  const sorted = [...entries];
  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => cheapest(a) - cheapest(b) || relevance(a, b));
    case "price_desc":
      return sorted.sort((a, b) => cheapest(b) - cheapest(a) || relevance(a, b));
    case "newest":
      return sorted.sort((a, b) => b.createdAt - a.createdAt || relevance(a, b));
    case "bestsellers":
      return sorted.sort((a, b) => b.sales - a.sales || relevance(a, b));
    case "relevance":
      return sorted.sort(relevance);
  }
}

/**
 * Filters, counts, sorts and paginates the catalog. Facet counts follow the
 * usual faceted-search rule: each facet is counted with every other filter
 * applied but its own, so its values stay selectable.
 */
export function searchCatalog(
  entries: readonly CatalogEntry[],
  input: SearchInput,
): CatalogSearchResult {
  const { query, facets } = input;
  const scoped = input.scope?.category
    ? entries.filter((entry) => entry.categories.includes(input.scope?.category ?? ""))
    : [...entries];

  const results = scoped.filter((entry) => matches(entry, query, facets));
  const pageSize = input.pageSize ?? CATALOG_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize));
  const page = Math.min(query.page, pageCount);
  const ids = sortEntries(results, query.sort)
    .slice((page - 1) * pageSize, page * pageSize)
    .map((entry) => entry.id);

  const priceBase = scoped.filter((entry) => matches(entry, query, facets, "price"));
  const prices = priceBase.flatMap((entry) => candidatePrices(entry, query, facets));
  const priceRange =
    prices.length > 0
      ? { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) }
      : null;

  const facetResults: FacetResult[] = facets
    .filter((facet) => facet.kind !== "price")
    .map((facet) => {
      const counts = new Map<string, number>();
      // Every value of the scope is listed, even when other filters bring it to 0.
      for (const entry of scoped) {
        for (const value of entryValues(entry, facet)) counts.set(value, counts.get(value) ?? 0);
      }
      for (const entry of scoped.filter((item) => matches(item, query, facets, facet.id))) {
        for (const value of new Set(entryValues(entry, facet))) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      const values = [...counts].map(([value, count]) => ({ value, count }));
      if (facet.kind === "option") values.sort((a, b) => compareOptionValues(a.value, b.value));
      return { id: facet.id, kind: facet.kind, values };
    });

  return { ids, total: results.length, page, pageCount, priceRange, facets: facetResults };
}
