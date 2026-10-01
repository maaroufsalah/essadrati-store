import "server-only";
import { createStoreClient } from "@nocido/api-client";
import { DEFAULT_PUBLIC_STORE_SETTINGS } from "@nocido/theme/defaults";
import type { PublicStoreSettings } from "@nocido/types";
import { cache } from "react";
import { publicEnv } from "./env";
import { medusaServerUrl, settingsRevalidateSeconds } from "./server-env";

/**
 * Public StoreSettings for the current request, deduplicated with React
 * cache() and kept in the Next.js data cache under the `store-settings` tag.
 * The backend revalidates the tag after each admin save.
 * Never throws: when the API is down or answers garbage, the neutral kit
 * defaults keep the site up and the problem is logged.
 */
export const getStoreSettings = cache(async (): Promise<PublicStoreSettings> => {
  const client = createStoreClient({
    baseUrl: medusaServerUrl(),
    publishableKey: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  });
  const result = await client.getStoreSettings({
    next: { revalidate: settingsRevalidateSeconds() },
  });
  if (result.ok) return result.data;
  console.error(
    `[settings] falling back to kit defaults: ${result.error.code}`,
    result.error.message,
  );
  return DEFAULT_PUBLIC_STORE_SETTINGS;
});
