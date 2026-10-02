import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { notifyOrder } from "../lib/notifications";

/**
 * Shipped and delivered emails. Medusa sends the fulfillment id; the order
 * is found through the order-fulfillment link. `no_notification` is honored.
 */
export default async function fulfillmentNotificationsHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>): Promise<void> {
  if (event.data.no_notification) return;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "order.id"],
    filters: { id: event.data.id },
  });
  const orderId = (data[0] as { order?: { id?: string } | null } | undefined)?.order?.id;
  if (!orderId) return;
  await notifyOrder(
    container,
    orderId,
    event.name === "delivery.created" ? "delivered" : "shipped",
  );
}

export const config: SubscriberConfig = {
  event: ["shipment.created", "delivery.created"],
};
