import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { revalidateStorefront } from "../lib/revalidate";
import { STORE_SETTINGS_UPDATED_EVENT } from "../workflows/update-store-settings";

export default async function storeSettingsUpdatedHandler({
  container,
}: SubscriberArgs<{ updatedAt: string }>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  await revalidateStorefront([CACHE_TAGS.storeSettings], logger);
}

export const config: SubscriberConfig = {
  event: STORE_SETTINGS_UPDATED_EVENT,
};
