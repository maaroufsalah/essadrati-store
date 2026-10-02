import type { Logger, RemoteQueryFunction } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  getVariantAvailability,
  ProductStatus,
  QueryContext,
} from "@medusajs/framework/utils";
import type { Knex } from "@medusajs/framework/mikro-orm/knex";
import type { CatalogEntry } from "./catalog-search";

/**
 * In-memory index of the published catalog for one region and sales
 * channel: what the faceted search filters, counts and sorts on. Built
 * with Query (calculated prices, inventory) and kept a few minutes; product
 * events and price changes drop it (catalog-changed subscriber). The store
 * API cannot filter or sort by calculated price, hence this index; it fits
 * a store of a few thousand products.
 */
const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { builtAt: number; entries: Promise<CatalogEntry[]> }>();

/** Drops every cached index (catalog, prices or inventory changed). */
export function invalidateCatalogIndex(): void {
  cache.clear();
}

interface Resolver {
  resolve<T>(key: string): T;
}

interface ProductRow {
  id: string;
  created_at: string | Date;
  metadata: Record<string, unknown> | null;
  categories: { handle: string }[] | null;
  collection: { handle: string } | null;
  sales_channels: { id: string }[] | null;
  variants:
    | {
        id: string;
        manage_inventory: boolean;
        allow_backorder: boolean;
        options: { value: string; option: { title: string } | null }[] | null;
        calculated_price: {
          calculated_amount: number | null;
          original_amount: number | null;
        } | null;
      }[]
    | null;
}

/** Units sold per product, on the current version of orders that were not canceled. */
async function salesByProduct(scope: Resolver): Promise<Map<string, number>> {
  const knex = scope.resolve<Knex>(ContainerRegistrationKeys.PG_CONNECTION);
  const rows: unknown[] = await knex("order_item as oi")
    .join("order_line_item as oli", "oli.id", "oi.item_id")
    .join("order as o", function joinOrder() {
      this.on("o.id", "=", "oi.order_id").andOn("o.version", "=", "oi.version");
    })
    .whereNull("o.canceled_at")
    .whereNull("o.deleted_at")
    .whereNull("oi.deleted_at")
    .whereNotNull("oli.product_id")
    .groupBy("oli.product_id")
    .select("oli.product_id")
    .sum({ quantity: "oi.quantity" });
  return new Map(
    (rows as { product_id: string; quantity: string | number }[]).map((row) => [
      row.product_id,
      Number(row.quantity) || 0,
    ]),
  );
}

/** Product rows -> index entries. Pure, for tests. */
export function toCatalogEntries(
  products: readonly ProductRow[],
  available: ReadonlySet<string>,
  sales: ReadonlyMap<string, number>,
): CatalogEntry[] {
  const ordered = [...products].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  return ordered.map((product, position) => {
    const options: Record<string, string[]> = {};
    const prices: number[] = [];
    const variants: { price: number | null; options: Record<string, string> }[] = [];
    let onSale = false;
    let inStock = false;
    for (const variant of product.variants ?? []) {
      for (const option of variant.options ?? []) {
        const title = option.option?.title;
        if (!title || !option.value) continue;
        const values = (options[title] ??= []);
        if (!values.includes(option.value)) values.push(option.value);
      }
      const price = Number(variant.calculated_price?.calculated_amount);
      if (Number.isFinite(price)) prices.push(price);
      variants.push({
        price: Number.isFinite(price) ? price : null,
        options: Object.fromEntries(
          (variant.options ?? []).flatMap((option) =>
            option.option?.title && option.value ? [[option.option.title, option.value]] : [],
          ),
        ),
      });
      const original = Number(variant.calculated_price?.original_amount);
      if (Number.isFinite(price) && Number.isFinite(original) && price < original) onSale = true;
      if (!variant.manage_inventory || variant.allow_backorder || available.has(variant.id)) {
        inStock = true;
      }
    }
    return {
      id: product.id,
      createdAt: new Date(product.created_at).getTime(),
      featured: product.metadata?.featured === true,
      position,
      categories: (product.categories ?? []).map((category) => category.handle),
      collection: product.collection?.handle ?? null,
      options,
      prices,
      variants,
      onSale,
      inStock,
      sales: sales.get(product.id) ?? 0,
    };
  });
}

async function build(
  scope: Resolver,
  context: { regionId: string; currencyCode: string; salesChannelId: string | null },
): Promise<CatalogEntry[]> {
  const query = scope.resolve<Omit<RemoteQueryFunction, symbol>>(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "created_at",
      "metadata",
      "categories.handle",
      "collection.handle",
      "sales_channels.id",
      "variants.id",
      "variants.manage_inventory",
      "variants.allow_backorder",
      "variants.options.value",
      "variants.options.option.title",
      "variants.calculated_price.calculated_amount",
      "variants.calculated_price.original_amount",
    ],
    filters: { status: ProductStatus.PUBLISHED },
    context: {
      variants: {
        calculated_price: QueryContext({
          region_id: context.regionId,
          currency_code: context.currencyCode,
        }),
      },
    },
  });
  const rows: unknown[] = data;
  const products = (rows as ProductRow[]).filter(
    (product) =>
      !context.salesChannelId ||
      (product.sales_channels ?? []).some((channel) => channel.id === context.salesChannelId),
  );

  const managed = products.flatMap((product) =>
    (product.variants ?? [])
      .filter((variant) => variant.manage_inventory && !variant.allow_backorder)
      .map((variant) => variant.id),
  );
  const available = new Set<string>();
  if (managed.length > 0 && context.salesChannelId) {
    const availability = await getVariantAvailability(query, {
      variant_ids: managed,
      sales_channel_id: context.salesChannelId,
    });
    for (const [id, entry] of Object.entries(availability)) {
      if ((entry.availability ?? 0) > 0) available.add(id);
    }
  }

  let sales = new Map<string, number>();
  try {
    sales = await salesByProduct(scope);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    scope
      .resolve<Logger>(ContainerRegistrationKeys.LOGGER)
      .warn(`[catalog] sales unavailable: ${message}`);
  }
  return toCatalogEntries(products, available, sales);
}

/** The cached index for a region and sales channel, built on first use. */
export function getCatalogIndex(
  scope: Resolver,
  context: { regionId: string; currencyCode: string; salesChannelId: string | null },
): Promise<CatalogEntry[]> {
  const key = `${context.regionId}:${context.salesChannelId ?? "*"}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.builtAt < TTL_MS) return cached.entries;
  const entries = build(scope, context);
  cache.set(key, { builtAt: Date.now(), entries });
  // A failed build is not kept.
  entries.catch(() => cache.delete(key));
  return entries;
}
