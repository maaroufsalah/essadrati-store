import type { HttpTypes } from "@nocido/api-client";

export interface VariantView {
  id: string;
  /** Option value, e.g. "500g". */
  label: string;
  amount: number | null;
  /** Regular price when the variant is on sale. */
  original: number | null;
}

export interface ProductDetail {
  id: string;
  handle: string;
  title: string;
  subtitle: string;
  description: string;
  images: string[];
  variants: VariantView[];
  categoryIds: string[];
  rating: number | null;
  reviewsCount: number;
}

function numeric(value: unknown): number | null {
  const number = typeof value === "string" ? Number(value) : value;
  return typeof number === "number" && Number.isFinite(number) ? number : null;
}

export function toProductDetail(product: HttpTypes.StoreProduct): ProductDetail {
  const images = [
    ...new Set(
      [product.thumbnail, ...(product.images ?? []).map((image) => image.url)].filter(
        (url): url is string => Boolean(url),
      ),
    ),
  ];
  const variants = (product.variants ?? [])
    .map((variant): VariantView => {
      const amount = numeric(variant.calculated_price?.calculated_amount);
      const original = numeric(variant.calculated_price?.original_amount);
      return {
        id: variant.id,
        label: variant.options?.[0]?.value ?? variant.title ?? "",
        amount,
        original: amount !== null && original !== null && original > amount ? original : null,
      };
    })
    .sort(
      (a, b) => (a.amount ?? Number.POSITIVE_INFINITY) - (b.amount ?? Number.POSITIVE_INFINITY),
    );
  const metadata = product.metadata ?? {};
  const rating = numeric(metadata.rating);
  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle ?? "",
    description: product.description ?? "",
    images,
    variants,
    categoryIds: (product.categories ?? []).map((category) => category.id),
    rating: rating !== null ? Math.min(5, Math.max(0, rating)) : null,
    reviewsCount: numeric(metadata.reviews_count) ?? 0,
  };
}

/** schema.org Product with one Offer per variant (prices in the store currency). */
export function productJsonLd(
  detail: ProductDetail,
  { url, currency, brand }: { url: string; currency: string; brand: string },
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: detail.title,
    description: detail.description || detail.subtitle,
    image: detail.images,
    sku: detail.variants[0]?.id,
    brand: { "@type": "Brand", name: brand },
    ...(detail.rating !== null && detail.reviewsCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: detail.rating,
            reviewCount: detail.reviewsCount,
          },
        }
      : {}),
    offers: detail.variants
      .filter((variant) => variant.amount !== null)
      .map((variant) => ({
        "@type": "Offer",
        name: variant.label,
        price: variant.amount,
        priceCurrency: currency,
        availability: "https://schema.org/InStock",
        url,
      })),
  };
}
