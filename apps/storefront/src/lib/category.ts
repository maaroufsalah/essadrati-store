import type { HttpTypes } from "@nocido/api-client";
import { type ProductCardData, toProductCardData } from "./product-view";

export const SORTS = ["featured", "price_asc", "price_desc", "newest"] as const;
export type Sort = (typeof SORTS)[number];
export const PAGE_SIZE = 12;

/** A product with what filtering and sorting need. */
export interface CatalogItem {
  card: ProductCardData;
  /** Option values of the variants (weights, sizes...). */
  values: string[];
  /** Calculated price of every variant. */
  prices: number[];
  createdAt: number;
  position: number;
}

export interface CategoryFilters {
  min: number | null;
  max: number | null;
  values: string[];
  sort: Sort;
  page: number;
}

export function toCatalogItem(product: HttpTypes.StoreProduct, position: number): CatalogItem {
  const values = new Set<string>();
  const prices: number[] = [];
  for (const variant of product.variants ?? []) {
    for (const option of variant.options ?? []) {
      if (option.value) values.add(option.value);
    }
    const amount = Number(variant.calculated_price?.calculated_amount);
    if (Number.isFinite(amount)) prices.push(amount);
  }
  return {
    card: toProductCardData(product),
    values: [...values],
    prices,
    createdAt: product.created_at ? new Date(product.created_at).getTime() : 0,
    position,
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

/** URL state -> filters. Unknown or invalid values are ignored, never fatal. */
export function parseFilters(params: SearchParams): CategoryFilters {
  const sort = first(params.sort);
  const rawValues = params.w;
  const values = (Array.isArray(rawValues) ? rawValues : rawValues ? rawValues.split(",") : [])
    .map((value) => value.trim())
    .filter(Boolean);
  const page = Math.floor(Number(first(params.page) ?? "1"));
  return {
    min: positiveNumber(first(params.min)),
    max: positiveNumber(first(params.max)),
    values: [...new Set(values)],
    sort: (SORTS as readonly string[]).includes(sort ?? "") ? (sort as Sort) : "featured",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Filters -> URL search params (defaults omitted, page reset unless kept). */
export function toSearchParams(filters: Partial<CategoryFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.min !== null && filters.min !== undefined) params.set("min", String(filters.min));
  if (filters.max !== null && filters.max !== undefined) params.set("max", String(filters.max));
  if (filters.values?.length) params.set("w", filters.values.join(","));
  if (filters.sort && filters.sort !== "featured") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

const cheapest = (item: CatalogItem) => item.card.price?.amount ?? Number.POSITIVE_INFINITY;

export function applyFilters(items: CatalogItem[], filters: CategoryFilters): CatalogItem[] {
  const { min, max, values } = filters;
  const filtered = items.filter((item) => {
    if (values.length > 0 && !item.values.some((value) => values.includes(value))) return false;
    if (min === null && max === null) return true;
    return item.prices.some(
      (price) => (min === null || price >= min) && (max === null || price <= max),
    );
  });
  const sorted = [...filtered];
  switch (filters.sort) {
    case "price_asc":
      sorted.sort((a, b) => cheapest(a) - cheapest(b));
      break;
    case "price_desc":
      sorted.sort((a, b) => cheapest(b) - cheapest(a));
      break;
    case "newest":
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "featured":
      sorted.sort(
        (a, b) => Number(b.card.featured) - Number(a.card.featured) || a.position - b.position,
      );
      break;
  }
  return sorted;
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pageCount);
  return { items: items.slice((current - 1) * size, current * size), page: current, pageCount };
}

const MEASURE = /^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|cl)$/i;

/**
 * Weights and volumes offered in the category, in a natural order
 * (250g < 500g < 1kg). Values without a unit (e.g. a box "1") are not
 * weight filters and are left out.
 */
export function availableValues(items: CatalogItem[]): string[] {
  const grams = (value: string): number => {
    const match = MEASURE.exec(value.trim());
    if (!match) return Number.POSITIVE_INFINITY;
    const amount = Number((match[1] ?? "0").replace(",", "."));
    const unit = (match[2] ?? "").toLowerCase();
    return unit === "kg" || unit === "l" ? amount * 1000 : unit === "cl" ? amount * 10 : amount;
  };
  return [...new Set(items.flatMap((item) => item.values))]
    .filter((value) => MEASURE.test(value.trim()))
    .sort((a, b) => grams(a) - grams(b) || a.localeCompare(b));
}

export function priceBounds(items: CatalogItem[]): { min: number; max: number } | null {
  const prices = items.flatMap((item) => item.prices);
  if (prices.length === 0) return null;
  return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
}
