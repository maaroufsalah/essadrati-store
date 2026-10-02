import "server-only";
import { CACHE_TAGS, createStoreClient, type HttpTypes, KIT_ROUTES } from "@nocido/api-client";
import type { CodCity, Locale } from "@nocido/types";
import { cache } from "react";
import { publicEnv } from "./env";
import { type ProductCardData, toProductCardData } from "./product-view";
import { medusaServerUrl } from "./server-env";
import { getStoreSettings } from "./settings";

/** Catalog data is cached for an hour and revalidated by the backend on changes. */
const CATALOG_REVALIDATE = 3600;
const CARD_FIELDS =
  "id,handle,title,subtitle,thumbnail,metadata,*images,*variants.calculated_price";

const nextOptions = (tags: string[] = []) => ({
  next: { revalidate: CATALOG_REVALIDATE, tags: [CACHE_TAGS.catalog, ...tags] },
});

/** Store client bound to the visitor locale (translated titles and descriptions). */
export const storeClient = cache(async (locale: Locale) => {
  const settings = await getStoreSettings();
  return createStoreClient({
    baseUrl: medusaServerUrl(),
    publishableKey: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
    locale: { locale, country: settings.contact.country },
  });
});

/** Region of the store currency, needed for calculated prices. */
export const getRegionId = cache(async (): Promise<string | null> => {
  const settings = await getStoreSettings();
  const client = createStoreClient({
    baseUrl: medusaServerUrl(),
    publishableKey: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });
  try {
    const { regions } = await client.sdk.client.fetch<HttpTypes.StoreRegionListResponse>(
      "/store/regions",
      {
        query: { limit: 20, fields: "id,currency_code" },
        ...nextOptions(),
      },
    );
    const currency = settings.localization.defaultCurrency.toLowerCase();
    return (regions.find((region) => region.currency_code === currency) ?? regions[0])?.id ?? null;
  } catch (error) {
    console.error("[catalog] regions unavailable", error);
    return null;
  }
});

export interface ProductQuery {
  id?: string[];
  limit?: number;
  offset?: number;
  categoryId?: string[];
  collectionId?: string[];
  handle?: string;
  order?: string;
  q?: string;
}

/** Products with calculated prices, never throws (empty list on failure). */
export async function listProducts(
  locale: Locale,
  query: ProductQuery = {},
): Promise<{ products: HttpTypes.StoreProduct[]; count: number }> {
  const [client, regionId] = await Promise.all([storeClient(locale), getRegionId()]);
  try {
    const body = await client.sdk.client.fetch<HttpTypes.StoreProductListResponse>(
      "/store/products",
      {
        query: {
          fields: CARD_FIELDS,
          region_id: regionId ?? undefined,
          limit: query.limit ?? 24,
          offset: query.offset ?? 0,
          id: query.id,
          category_id: query.categoryId,
          collection_id: query.collectionId,
          handle: query.handle,
          order: query.order,
          q: query.q,
        },
        ...nextOptions(),
      },
    );
    return { products: body.products, count: body.count };
  } catch (error) {
    console.error("[catalog] products unavailable", error);
    return { products: [], count: 0 };
  }
}

export async function listProductCards(
  locale: Locale,
  query: ProductQuery = {},
): Promise<ProductCardData[]> {
  const { products } = await listProducts(locale, query);
  return products.map(toProductCardData);
}

export const listCategories = cache(
  async (locale: Locale): Promise<HttpTypes.StoreProductCategory[]> => {
    const client = await storeClient(locale);
    try {
      const body = await client.sdk.client.fetch<HttpTypes.StoreProductCategoryListResponse>(
        "/store/product-categories",
        {
          query: { limit: 50, fields: "id,handle,name,description,rank,metadata" },
          ...nextOptions(),
        },
      );
      return [...body.product_categories].sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    } catch (error) {
      console.error("[catalog] categories unavailable", error);
      return [];
    }
  },
);

export const listCollections = cache(
  async (locale: Locale): Promise<HttpTypes.StoreCollection[]> => {
    const client = await storeClient(locale);
    try {
      const body = await client.sdk.client.fetch<HttpTypes.StoreCollectionListResponse>(
        "/store/collections",
        {
          query: { limit: 50, fields: "id,handle,title,metadata" },
          ...nextOptions(),
        },
      );
      return body.collections;
    } catch (error) {
      console.error("[catalog] collections unavailable", error);
      return [];
    }
  },
);

export async function getCategoryByHandle(
  locale: Locale,
  handle: string,
): Promise<HttpTypes.StoreProductCategory | null> {
  const categories = await listCategories(locale);
  return categories.find((category) => category.handle === handle) ?? null;
}

const PRODUCT_FIELDS =
  "id,handle,title,subtitle,description,thumbnail,metadata,created_at,updated_at,*images,*options,*options.values,*variants.calculated_price,*variants.options,variants.sku,variants.manage_inventory,variants.allow_backorder,+variants.inventory_quantity,*categories,*collection";

/** One product with everything the product page needs, or null. */
export async function getProductByHandle(
  locale: Locale,
  handle: string,
): Promise<HttpTypes.StoreProduct | null> {
  const [client, regionId] = await Promise.all([storeClient(locale), getRegionId()]);
  try {
    const body = await client.sdk.client.fetch<HttpTypes.StoreProductListResponse>(
      "/store/products",
      {
        query: { fields: PRODUCT_FIELDS, region_id: regionId ?? undefined, handle, limit: 1 },
        ...nextOptions(),
      },
    );
    return body.products[0] ?? null;
  } catch (error) {
    console.error("[catalog] product unavailable", error);
    return null;
  }
}

const FEED_FIELDS =
  "id,handle,title,subtitle,description,thumbnail,updated_at,*images,*variants,*variants.calculated_price,*categories";

/**
 * Every published product with variants and prices, for the sitemap and the
 * product feeds. Pages of 100, at most 2000 products; empty on failure.
 */
export async function listAllProducts(locale: Locale): Promise<HttpTypes.StoreProduct[]> {
  const [client, regionId] = await Promise.all([storeClient(locale), getRegionId()]);
  const products: HttpTypes.StoreProduct[] = [];
  try {
    for (let offset = 0; offset < 2000; offset += 100) {
      const body = await client.sdk.client.fetch<HttpTypes.StoreProductListResponse>(
        "/store/products",
        {
          query: { fields: FEED_FIELDS, region_id: regionId ?? undefined, limit: 100, offset },
          ...nextOptions(),
        },
      );
      products.push(...body.products);
      if (products.length >= body.count || body.products.length === 0) break;
    }
  } catch (error) {
    console.error("[catalog] product list unavailable", error);
  }
  return products;
}

/** Active COD cities with fee and delay (backend moroccan-cities module). */
export const listCities = cache(async (): Promise<CodCity[]> => {
  const client = createStoreClient({
    baseUrl: medusaServerUrl(),
    publishableKey: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });
  try {
    const body = await client.sdk.client.fetch<{ cities: CodCity[] }>(KIT_ROUTES.cities, {
      next: { revalidate: 600, tags: [CACHE_TAGS.cities] },
    });
    return body.cities;
  } catch (error) {
    console.error("[catalog] cities unavailable", error);
    return [];
  }
});
