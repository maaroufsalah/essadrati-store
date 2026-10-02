import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { type NotificationKind, notifyOrder } from "../lib/notifications";
import { COD_EVENTS } from "../workflows/cod/lib";

const KINDS: Record<string, Exclude<NotificationKind, "merchant">> = {
  [COD_EVENTS.placed]: "placed",
  [COD_EVENTS.confirmed]: "confirmed",
  [COD_EVENTS.cancelled]: "cancelled",
};

/** COD lifecycle emails: order received (and store alert), confirmed, cancelled. */
export default async function codNotificationsHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const kind = KINDS[event.name];
  if (kind) await notifyOrder(container, event.data.id, kind);
}

export const config: SubscriberConfig = {
  event: [COD_EVENTS.placed, COD_EVENTS.confirmed, COD_EVENTS.cancelled],
};
