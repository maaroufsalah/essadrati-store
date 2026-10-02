import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  addShippingMethodToCartWorkflow,
  completeCartWorkflow,
  createCartWorkflow,
  createPaymentCollectionForCartWorkflow,
  createPaymentSessionsWorkflow,
  emitEventStep,
  updateCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { COD_PAYMENT_PROVIDER_ID } from "../../modules/cod-payment";
import { COD_EVENTS } from "./lib";
import {
  type CodContextInput,
  computeCodFeeStep,
  getCartPaymentCollectionStep,
  resolveCodContextStep,
  updateOrderMetadataStep,
} from "./steps";

export interface PlaceCodOrderInput extends CodContextInput {
  /** Existing cart (checkout), or `items` for a one-step "buy now" order. */
  cart_id?: string;
  items?: { variant_id: string; quantity: number }[];
}

export interface PlaceCodOrderOutput {
  orderId: string;
  cartId: string;
  shippingFee: number;
}

/**
 * Cash on delivery order, server-side end to end:
 * 1. settings, city and shipping option resolved on the backend;
 * 2. cart created from `items`, or the given cart updated, with the
 *    customer, the technical email and the delivery address;
 * 3. delivery fee from the city (free above the threshold), set on the
 *    calculated COD shipping option;
 * 4. COD payment session, cart completion, order metadata cod_status=pending;
 * 5. cod.order_placed event.
 */
export const placeCodOrderWorkflow = createWorkflow(
  "place-cod-order",
  (input: PlaceCodOrderInput) => {
    const context = resolveCodContextStep(input);

    const created = when({ input }, ({ input: data }) => !data.cart_id).then(() =>
      createCartWorkflow.runAsStep({
        input: transform({ input, context }, ({ input: data, context: ctx }) => ({
          region_id: ctx.regionId,
          sales_channel_id: ctx.salesChannelId,
          locale: ctx.cartLocale,
          email: ctx.email,
          items: data.items ?? [],
          shipping_address: ctx.address,
          billing_address: ctx.address,
          metadata: ctx.metadata,
        })),
      }),
    );

    const cartId = transform({ input, created }, ({ input: data, created: cart }) => {
      const id = data.cart_id ?? cart?.id;
      if (!id) throw new Error("cod.noCart");
      return id;
    });

    when({ input }, ({ input: data }) => Boolean(data.cart_id)).then(() =>
      updateCartWorkflow.runAsStep({
        input: transform({ cartId, context }, ({ cartId: id, context: ctx }) => ({
          id,
          email: ctx.email,
          shipping_address: ctx.address,
          billing_address: ctx.address,
          metadata: ctx.metadata,
        })),
      }),
    );

    const { fee } = computeCodFeeStep({ cartId, context });

    addShippingMethodToCartWorkflow.runAsStep({
      input: transform({ cartId, context, fee }, ({ cartId: id, context: ctx, fee: amount }) => ({
        cart_id: id,
        options: [{ id: ctx.shippingOptionId, data: { city_id: ctx.city.id, fee: amount } }],
      })),
    });

    createPaymentCollectionForCartWorkflow.runAsStep({
      input: transform({ cartId }, ({ cartId: id }) => ({ cart_id: id })),
    });
    const collection = getCartPaymentCollectionStep({ cartId });
    createPaymentSessionsWorkflow.runAsStep({
      input: transform({ collection }, ({ collection: paymentCollection }) => ({
        payment_collection_id: paymentCollection.id,
        provider_id: COD_PAYMENT_PROVIDER_ID,
      })),
    });

    const order = completeCartWorkflow.runAsStep({
      input: transform({ cartId }, ({ cartId: id }) => ({ id })),
    });

    updateOrderMetadataStep(
      transform({ order, context }, ({ order: placed, context: ctx }) => ({
        orderId: placed.id,
        metadata: {
          ...ctx.metadata,
          cod_status: "pending",
          cod_status_at: new Date().toISOString(),
        },
      })),
    );

    emitEventStep({
      eventName: COD_EVENTS.placed,
      data: transform({ order }, ({ order: placed }) => ({ id: placed.id })),
    });

    return new WorkflowResponse(
      transform({ order, cartId, fee }, ({ order: placed, cartId: id, fee: amount }) => ({
        orderId: placed.id,
        cartId: id,
        shippingFee: amount,
      })),
    );
  },
);
