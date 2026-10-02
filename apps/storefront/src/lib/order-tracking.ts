import "server-only";
import { KIT_ROUTES, PUBLISHABLE_KEY_HEADER } from "@nocido/api-client";
import type { CodOrderTracking } from "@nocido/types";
import { publicEnv } from "./env";
import { medusaServerUrl } from "./server-env";

/** Public tracking of a COD order, never cached (the status changes). Null if unknown. */
export async function getOrderTracking(id: string): Promise<CodOrderTracking | null> {
  if (!/^order_[A-Z0-9]{20,40}$/.test(id)) return null;
  try {
    const response = await fetch(`${medusaServerUrl()}${KIT_ROUTES.codOrders}/${id}`, {
      headers: { [PUBLISHABLE_KEY_HEADER]: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { order?: CodOrderTracking };
    return body.order ?? null;
  } catch (error) {
    console.error("[order] tracking failed", error);
    return null;
  }
}
