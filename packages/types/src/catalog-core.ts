/*
 * Catalog search building blocks without zod, safe for client bundles
 * (@nocido/types/client). catalog.ts adds the schemas.
 */
import type { LocalizedString } from "./locale-core";

/** Facets computed by the kit; `option` facets read a product option (weight, size...). */
export const FACET_KINDS = [
  "price",
  "category",
  "collection",
  "availability",
  "promo",
  "option",
] as const;
export type FacetKind = (typeof FACET_KINDS)[number];

/**
 * One filter of the catalog pages, set in admin › Catalogue. `id` is its
 * URL parameter (?poids=500g). Option facets name the product option by
 * its title in the store default language (Medusa option titles are per
 * product, matched by title).
 */
export interface CatalogFacet {
  id: string;
  kind: FacetKind;
  /** Option title, for `option` facets only. */
  option?: string;
  enabled: boolean;
  /** Shown above the filter; the storefront has defaults for built-in kinds. */
  label: LocalizedString;
}

/** URL parameters the facets may not use. */
export const RESERVED_CATALOG_PARAMS = ["sort", "page", "min", "max", "q"] as const;

export const CATALOG_SORTS = [
  "relevance",
  "price_asc",
  "price_desc",
  "newest",
  "bestsellers",
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number];

export const CATALOG_PAGE_SIZE = 12;

/** Value of the availability facet. */
export const IN_STOCK = "in_stock";
/** Value of the promo facet. */
export const ON_SALE = "on_sale";

export const DEFAULT_CATALOG_FACETS: readonly CatalogFacet[] = [
  { id: "price", kind: "price", enabled: true, label: {} },
  { id: "category", kind: "category", enabled: true, label: {} },
  { id: "collection", kind: "collection", enabled: true, label: {} },
  { id: "availability", kind: "availability", enabled: true, label: {} },
  { id: "promo", kind: "promo", enabled: true, label: {} },
];

/** One value of a facet with the number of products it would show. */
export interface FacetValueCount {
  value: string;
  count: number;
}

export interface FacetResult {
  id: string;
  kind: FacetKind;
  values: FacetValueCount[];
}

/** Answer of GET /store/catalog/search: one page of product ids plus the facets. */
export interface CatalogSearchResult {
  ids: string[];
  total: number;
  page: number;
  pageCount: number;
  /** Price range of the products matching every filter but the price one. */
  priceRange: { min: number; max: number } | null;
  facets: FacetResult[];
}

/** Filters of a catalog page, as read from the URL. */
export interface CatalogQuery {
  /** Facet id -> selected values (OR inside a facet, AND between facets). */
  selected: Record<string, string[]>;
  min: number | null;
  max: number | null;
  /** Text search (?q=), trimmed, null when empty. */
  q: string | null;
  sort: CatalogSort;
  page: number;
}

/** True when the query narrows the catalog (used for noindex and the chips). */
export function isFiltered(query: CatalogQuery): boolean {
  return (
    query.min !== null ||
    query.max !== null ||
    query.q !== null ||
    Object.values(query.selected).some((values) => values.length > 0)
  );
}

type RawParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function amountParam(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/** Comma-separated or repeated values, trimmed and deduplicated (50 at most). */
export function listParam(value: string | string[] | undefined): string[] {
  const parts = (Array.isArray(value) ? value : value ? [value] : []).flatMap((part) =>
    part.split(","),
  );
  return [...new Set(parts.map((part) => part.trim()).filter(Boolean))].slice(0, 50);
}

/**
 * URL search params -> CatalogQuery, for the given facets. Invalid values
 * are ignored, never fatal; min and max are swapped when inverted.
 */
export function parseCatalogQuery(
  raw: RawParams,
  facets: readonly Pick<CatalogFacet, "id" | "kind">[],
): CatalogQuery {
  const sort = firstParam(raw.sort);
  const page = Math.floor(Number(firstParam(raw.page) ?? "1"));
  let min = amountParam(firstParam(raw.min));
  let max = amountParam(firstParam(raw.max));
  if (min !== null && max !== null && min > max) [min, max] = [max, min];
  const selected: Record<string, string[]> = {};
  for (const facet of facets) {
    if (facet.kind === "price") continue;
    const values = listParam(raw[facet.id]);
    if (values.length > 0) selected[facet.id] = values;
  }
  const text = firstParam(raw.q)?.trim().slice(0, 100);
  return {
    selected,
    min,
    max,
    q: text?.length ? text : null,
    sort: (CATALOG_SORTS as readonly string[]).includes(sort ?? "")
      ? (sort as CatalogSort)
      : "relevance",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** CatalogQuery -> URL search params; defaults are left out, facets in their order. */
export function toCatalogSearchParams(
  query: CatalogQuery,
  facets: readonly Pick<CatalogFacet, "id">[],
): URLSearchParams {
  const params = new URLSearchParams();
  for (const facet of facets) {
    const values = query.selected[facet.id];
    if (values?.length) params.set(facet.id, values.join(","));
  }
  if (query.min !== null) params.set("min", String(query.min));
  if (query.max !== null) params.set("max", String(query.max));
  if (query.q) params.set("q", query.q);
  if (query.sort !== "relevance") params.set("sort", query.sort);
  if (query.page > 1) params.set("page", String(query.page));
  return params;
}

/** The query with a facet value added or removed; back to page 1. */
export function toggleFacetValue(
  query: CatalogQuery,
  facetId: string,
  value: string,
): CatalogQuery {
  const current = query.selected[facetId] ?? [];
  const values = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
  const selected = { ...query.selected, [facetId]: values };
  if (values.length === 0) delete selected[facetId];
  return { ...query, selected, page: 1 };
}

/** The query without any filter or search (the sort is kept); page 1. */
export function clearCatalogFilters(query: CatalogQuery): CatalogQuery {
  return { selected: {}, min: null, max: null, q: null, sort: query.sort, page: 1 };
}

/** Number of active filters (each value counts, the price range counts once). */
export function activeFilterCount(query: CatalogQuery): number {
  return (
    Object.values(query.selected).reduce((total, values) => total + values.length, 0) +
    (query.min !== null || query.max !== null ? 1 : 0) +
    (query.q !== null ? 1 : 0)
  );
}
