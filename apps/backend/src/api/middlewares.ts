import {
  defineMiddlewares,
  type MedusaNextFunction,
  type MedusaRequest,
  type MedusaResponse,
} from "@medusajs/framework/http";

/**
 * COD fees are computed server-side by the place-cod-order workflow and
 * passed to the shipping provider. The generic store routes that add a
 * shipping method or complete a cart would let a client choose that data,
 * so they are closed: checkout goes through POST /store/cod/orders.
 */
function closedForCod(_req: MedusaRequest, res: MedusaResponse, _next: MedusaNextFunction): void {
  res.status(403).json({ type: "not_allowed", message: "cod.useCodCheckout" });
}

export default defineMiddlewares({
  routes: [
    { matcher: "/store/carts/:id/shipping-methods", method: ["POST"], middlewares: [closedForCod] },
    { matcher: "/store/carts/:id/complete", method: ["POST"], middlewares: [closedForCod] },
  ],
});
