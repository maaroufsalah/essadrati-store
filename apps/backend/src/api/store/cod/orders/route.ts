import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { ICacheService, ILockingModule } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { placeCodOrderBodySchema } from "../../../../lib/cod-schemas";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { placeCodOrderWorkflow } from "../../../../workflows/cod/place-cod-order";

/** Same key within a day returns the same order (retry after a timeout, double tap). */
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const IDEMPOTENCY_HEADER = "idempotency-key";

function idempotencyKey(req: MedusaRequest): string | null {
  const raw = req.headers[IDEMPOTENCY_HEADER];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^[A-Za-z0-9-]{16,64}$/.test(value) ? value : null;
}

/**
 * POST /store/cod/orders: places a cash on delivery order, from a cart
 * (checkout) or from items (one-step product form). Fees are computed on
 * the backend from the city; the client never sends a price.
 * With an `Idempotency-Key` header, a retried request returns the order
 * already created instead of a duplicate.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = placeCodOrderBodySchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));

  const key = idempotencyKey(req);
  const cache = req.scope.resolve<ICacheService>(Modules.CACHE);
  const locking = req.scope.resolve<ILockingModule>(Modules.LOCKING);
  const cacheKey = key ? `cod:order:${key}` : null;

  const place = async (): Promise<string> => {
    if (cacheKey) {
      const existing = await cache.get<string>(cacheKey);
      if (existing) return existing;
    }
    const { result } = await placeCodOrderWorkflow(req.scope).run({ input: parsed.data });
    if (cacheKey) await cache.set(cacheKey, result.orderId, IDEMPOTENCY_TTL_SECONDS);
    return result.orderId;
  };

  const orderId = cacheKey
    ? await locking.execute(cacheKey, place, { timeout: 120 })
    : await place();

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "total",
      "shipping_total",
      "item_total",
      "currency_code",
      "metadata",
    ],
    filters: { id: orderId },
  });
  res.status(201).json({ order: data[0] });
}
