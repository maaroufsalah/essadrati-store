import "server-only";
import { CACHE_TAGS, KIT_ROUTES } from "@nocido/api-client";
import type { CatalogSearchResult, Locale } from "@nocido/types";
import { getRegionId, listProducts, storeClient } from "./catalog";
import { type ProductCardData, toProductCardData } from "./product-view";

/** Search answers are short-lived: prices and stock move, the backend index lives 5 minutes. */
const SEARCH_REVALIDATE = 300;

export interface CatalogPage {
  products: ProductCardData[];
  result: CatalogSearchResult;
}

const EMPTY: CatalogSearchResult = {
  ids: [],
  total: 0,
  page: 1,
  pageCount: 1,
  priceRange: null,
  facets: [],
};

/**
 * One page of the catalog: the backend filters, counts, sorts and
 * paginates (GET /store/catalog/search), then only that page's products are
 * loaded, translated and priced, from /store/products. Never throws.
 */
export async function searchCatalogPage(
  locale: Locale,
  options: { params: URLSearchParams; scopeCategory?: string },
): Promise<CatalogPage> {
  const [client, regionId] = await Promise.all([storeClient(locale), getRegionId()]);
  if (!regionId) return { products: [], result: EMPTY };

  let result: CatalogSearchResult;
  try {
    const query: Record<string, string> = Object.fromEntries(options.params);
    query.region_id = regionId;
    if (options.scopeCategory) query.scope_category = options.scopeCategory;
    result = await client.sdk.client.fetch<CatalogSearchResult>(KIT_ROUTES.catalogSearch, {
      query,
      next: { revalidate: SEARCH_REVALIDATE, tags: [CACHE_TAGS.catalog] },
    });
  } catch (error) {
    console.error("[catalog] search unavailable", error);
    return { products: [], result: EMPTY };
  }
  if (result.ids.length === 0) return { products: [], result };

  const { products } = await listProducts(locale, { id: result.ids, limit: result.ids.length });
  const byId = new Map(products.map((product) => [product.id, product]));
  return {
    // Keep the search order; a product unpublished meanwhile is skipped.
    products: result.ids.flatMap((id) => {
      const product = byId.get(id);
      return product ? [toProductCardData(product)] : [];
    }),
    result,
  };
}
