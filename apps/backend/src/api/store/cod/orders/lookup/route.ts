import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { codOrderLookupSchema } from "@nocido/types";
import { findTrackedOrders } from "../../../../../lib/cod-tracking";
import { sendInvalid, zodIssues } from "../../../../../lib/validation";

/**
 * POST /store/cod/orders/lookup { phone, display_id }: finds an order from
 * the phone used to place it and its number. Both must match; the answer is
 * the same 404 whichever is wrong.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = codOrderLookupSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));

  const [order] = await findTrackedOrders(req.scope, { display_id: parsed.data.display_id });
  const metadata = order?.metadata ?? {};
  if (!order || metadata.cod !== true || metadata.customer_phone !== parsed.data.phone) {
    res.status(404).json({ type: "not_found", message: "order.notFound" });
    return;
  }
  res.json({ order_id: order.id });
}
