import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { placeCodOrderBodySchema } from "../../../../lib/cod-schemas";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { placeCodOrderWorkflow } from "../../../../workflows/cod/place-cod-order";

/**
 * POST /store/cod/orders: places a cash on delivery order, from a cart
 * (checkout) or from items (one-step product form). Fees are computed on
 * the backend from the city; the client never sends a price.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = placeCodOrderBodySchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));

  const { result } = await placeCodOrderWorkflow(req.scope).run({ input: parsed.data });

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
    filters: { id: result.orderId },
  });
  res.status(201).json({ order: data[0] });
}
