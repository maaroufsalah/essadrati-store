import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { routeParam, sendInvalid } from "../../../../../../lib/validation";
import { confirmCodWorkflow } from "../../../../../../workflows/cod/confirm-cod";

/** POST /admin/cod/orders/:id/confirm and /admin/cod/orders/:id/cancel. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const id = routeParam(req, "id");
  const action = routeParam(req, "action");
  if (action !== "confirm" && action !== "cancel") {
    return sendInvalid(res, [{ path: "action", code: "cod.invalidAction" }]);
  }
  const { result } = await confirmCodWorkflow(req.scope).run({
    input: { order_id: id, action, actor_id: req.auth_context.actor_id },
  });
  res.json({ order_id: result.orderId, cod_status: result.codStatus });
}
