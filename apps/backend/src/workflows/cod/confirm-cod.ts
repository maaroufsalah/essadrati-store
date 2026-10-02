import { MedusaError } from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { cancelOrderWorkflow, emitEventStep } from "@medusajs/medusa/core-flows";
import { type CodAction, COD_EVENTS, nextCodStatus } from "./lib";
import { loadCodOrderStep, updateOrderMetadataStep } from "./steps";

export interface ConfirmCodInput {
  order_id: string;
  action: CodAction;
  /** Admin user performing the action, for the audit trail in metadata. */
  actor_id?: string;
}

/**
 * Phone confirmation of a COD order by the admin:
 * - confirm: pending -> confirmed;
 * - cancel: pending or confirmed -> cancelled, and the Medusa order is cancelled
 *   (payment cancelled, reservations released).
 * Cash collection stays the standard "Capture payment" action on delivery.
 */
export const confirmCodWorkflow = createWorkflow("confirm-cod", (input: ConfirmCodInput) => {
  const order = loadCodOrderStep({ orderId: input.order_id });

  const status = transform({ order, input }, ({ order: current, input: data }) => {
    const next = nextCodStatus(current.codStatus, data.action);
    if (!next) throw new MedusaError(MedusaError.Types.NOT_ALLOWED, "cod.invalidTransition");
    return next;
  });

  when({ input }, ({ input: data }) => data.action === "cancel").then(() =>
    cancelOrderWorkflow.runAsStep({
      input: transform({ input }, ({ input: data }) => ({
        order_id: data.order_id,
        canceled_by: data.actor_id,
      })),
    }),
  );

  const metadata = updateOrderMetadataStep(
    transform({ input, status }, ({ input: data, status: next }) => ({
      orderId: data.order_id,
      metadata: {
        cod_status: next,
        cod_status_at: new Date().toISOString(),
        ...(data.actor_id ? { cod_status_by: data.actor_id } : {}),
      },
    })),
  );

  emitEventStep({
    eventName: transform({ input }, ({ input: data }) =>
      data.action === "confirm" ? COD_EVENTS.confirmed : COD_EVENTS.cancelled,
    ),
    data: transform({ input }, ({ input: data }) => ({ id: data.order_id })),
  });

  return new WorkflowResponse(
    transform({ input, status, metadata }, ({ input: data, status: next, metadata: meta }) => ({
      orderId: data.order_id,
      codStatus: next,
      metadata: meta,
    })),
  );
});
