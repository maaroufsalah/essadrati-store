import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { invalidateCatalogIndex } from "../lib/catalog-index";
import { revalidateStorefront } from "../lib/revalidate";

/**
 * Products, variants, categories and collections changed in the admin:
 * the storefront drops its cached catalog pages and the search index is
 * rebuilt. Price list edits are not evented by Medusa; they show up when the
 * search index (5 minutes) and the catalog cache (1 hour) expire.
 */
export default async function catalogChangedHandler({ container }: SubscriberArgs): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  invalidateCatalogIndex();
  await revalidateStorefront([CACHE_TAGS.catalog], logger);
}

export const config: SubscriberConfig = {
  event: [
    "product.created",
    "product.updated",
    "product.deleted",
    "product-variant.created",
    "product-variant.updated",
    "product-variant.deleted",
    "product-category.created",
    "product-category.updated",
    "product-category.deleted",
    "product-collection.created",
    "product-collection.updated",
    "product-collection.deleted",
  ],
};
