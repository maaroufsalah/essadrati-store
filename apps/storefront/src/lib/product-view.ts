import type { HttpTypes } from "@nocido/api-client";

/** What cards, grids and carousels need from a Medusa store product. */
export interface ProductCardData {
  id: string;
  handle: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  /** Cheapest variant: sale price, and the regular price when discounted. */
  price: { amount: number; original: number | null } | null;
  /** True when variants have different prices ("from" label). */
  priceVaries: boolean;
  rating: number | null;
  reviewsCount: number;
  featured: boolean;
  defaultVariantId: string | null;
  variantCount: number;
}

function numeric(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

interface VariantPrice {
  id: string;
  amount: number;
  original: number | null;
}

function variantPrice(variant: HttpTypes.StoreProductVariant): VariantPrice | null {
  const calculated = variant.calculated_price;
  const amount = numeric(calculated?.calculated_amount);
  if (amount === null) return null;
  const original = numeric(calculated?.original_amount);
  return {
    id: variant.id,
    amount,
    original: original !== null && original > amount ? original : null,
  };
}

export function toProductCardData(product: HttpTypes.StoreProduct): ProductCardData {
  const prices = (product.variants ?? [])
    .map(variantPrice)
    .filter((price): price is VariantPrice => price !== null)
    .sort((a, b) => a.amount - b.amount);
  const cheapest = prices[0] ?? null;
  const metadata = product.metadata ?? {};
  const rating = numeric(metadata.rating);

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle ?? null,
    thumbnail: product.thumbnail ?? product.images?.[0]?.url ?? null,
    price: cheapest ? { amount: cheapest.amount, original: cheapest.original } : null,
    priceVaries: new Set(prices.map((price) => price.amount)).size > 1,
    rating: rating !== null ? Math.min(5, Math.max(0, rating)) : null,
    reviewsCount: numeric(metadata.reviews_count) ?? 0,
    featured: metadata.featured === true,
    defaultVariantId: cheapest?.id ?? product.variants?.[0]?.id ?? null,
    variantCount: product.variants?.length ?? 0,
  };
}

/** next/image cannot optimize SVG placeholders: they are served as is. */
export function isSvg(url: string): boolean {
  return /\.svg(?:$|\?)/i.test(url);
}
