import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { findTrackedOrders, toCodTracking } from "../../../../../lib/cod-tracking";

/**
 * GET /store/cod/orders/:id: public tracking of a COD order. The order id
 * (ULID) is the capability, as on the thank you link; the response carries
 * no full name, address or phone number.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const id = req.params.id ?? "";
  if (!/^order_[A-Z0-9]{20,40}$/.test(id)) {
    res.status(404).json({ type: "not_found", message: "order.notFound" });
    return;
  }
  const [order] = await findTrackedOrders(req.scope, { id });
  const tracking = order ? toCodTracking(order) : null;
  if (!tracking) {
    res.status(404).json({ type: "not_found", message: "order.notFound" });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  res.json({ order: tracking });
}
