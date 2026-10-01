import type { Logger } from "@medusajs/framework/types";

/** Header carrying REVALIDATE_SECRET, checked by the storefront route. */
export const REVALIDATE_SECRET_HEADER = "x-revalidate-secret";

/**
 * Asks the storefront to drop cached data for `tags`.
 * STOREFRONT_REVALIDATE_URL is the storefront origin as seen from the
 * backend (http://storefront:3000 in Docker, http://localhost:3000 in dev).
 * Missing configuration or an unreachable storefront only logs: the cache
 * then expires on its own.
 */
export async function revalidateStorefront(tags: string[], logger: Logger): Promise<void> {
  const origin = process.env.STOREFRONT_REVALIDATE_URL?.trim();
  const secret = process.env.REVALIDATE_SECRET?.trim();
  if (!origin || !secret) {
    logger.debug("[revalidate] STOREFRONT_REVALIDATE_URL or REVALIDATE_SECRET not set, skipped");
    return;
  }

  try {
    const response = await fetch(new URL("/api/revalidate", origin), {
      method: "POST",
      headers: { "content-type": "application/json", [REVALIDATE_SECRET_HEADER]: secret },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      logger.warn(`[revalidate] storefront answered ${response.status} for ${tags.join(", ")}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[revalidate] storefront unreachable: ${message}`);
  }
}
