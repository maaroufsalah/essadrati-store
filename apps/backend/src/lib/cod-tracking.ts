import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { type CodOrderTracking, type CodStatus, codTracking, maskPhone } from "@nocido/types";

const TRACKING_FIELDS = [
  "id",
  "display_id",
  "created_at",
  "canceled_at",
  "currency_code",
  "item_total",
  "shipping_total",
  "total",
  "metadata",
  "items.id",
  "items.variant_id",
  "items.product_handle",
  "items.title",
  "items.product_title",
  "items.variant_title",
  "items.thumbnail",
  "items.quantity",
  "items.unit_price",
  "items.total",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
];

interface TrackedOrderRow {
  id: string;
  display_id: number;
  created_at: Date | string;
  canceled_at?: Date | string | null;
  currency_code: string;
  item_total: unknown;
  shipping_total: unknown;
  total: unknown;
  metadata?: Record<string, unknown> | null;
  items?: ({
    id: string;
    variant_id?: string | null;
    product_handle?: string | null;
    title: string;
    product_title?: string | null;
    variant_title?: string | null;
    thumbnail?: string | null;
    quantity: unknown;
    unit_price: unknown;
    total: unknown;
  } | null)[];
  fulfillments?: ({
    shipped_at?: Date | string | null;
    delivered_at?: Date | string | null;
    canceled_at?: Date | string | null;
  } | null)[];
}

const iso = (value: Date | string | null | undefined): string | null =>
  value ? new Date(value).toISOString() : null;
const amount = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** Earliest date of an event across the active fulfillments. */
function firstDate(
  fulfillments: TrackedOrderRow["fulfillments"],
  key: "shipped_at" | "delivered_at",
): string | null {
  const dates = (fulfillments ?? [])
    .filter((fulfillment) => fulfillment && !fulfillment.canceled_at)
    .map((fulfillment) => iso(fulfillment?.[key]))
    .filter((value): value is string => Boolean(value))
    .sort();
  return dates[0] ?? null;
}

/** Public tracking view of a COD order. Null for other orders. */
export function toCodTracking(order: TrackedOrderRow): CodOrderTracking | null {
  const metadata = order.metadata ?? {};
  if (metadata.cod !== true) return null;
  const { state, timeline } = codTracking({
    createdAt: iso(order.created_at) ?? new Date(0).toISOString(),
    codStatus: (text(metadata.cod_status) as CodStatus | null) ?? null,
    codStatusAt: text(metadata.cod_status_at),
    canceledAt: iso(order.canceled_at),
    shippedAt: firstDate(order.fulfillments, "shipped_at"),
    deliveredAt: firstDate(order.fulfillments, "delivered_at"),
  });
  const name = text(metadata.customer_name) ?? "";
  return {
    id: order.id,
    display_id: order.display_id,
    created_at: iso(order.created_at) ?? "",
    currency_code: order.currency_code,
    item_total: amount(order.item_total),
    shipping_total: amount(order.shipping_total),
    total: amount(order.total),
    state,
    timeline,
    first_name: name.trim().split(/\s+/)[0] ?? "",
    city_id: text(metadata.city_id),
    phone_masked: maskPhone(text(metadata.customer_phone) ?? ""),
    items: (order.items ?? [])
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        id: item.id,
        variant_id: item.variant_id ?? null,
        product_handle: item.product_handle ?? null,
        title: item.product_title ?? item.title,
        variant_title: item.variant_title ?? null,
        thumbnail: item.thumbnail ?? null,
        quantity: amount(item.quantity),
        unit_price: amount(item.unit_price),
        total: amount(item.total),
      })),
  };
}

export async function findTrackedOrders(
  container: MedusaContainer,
  filters: Record<string, unknown>,
): Promise<TrackedOrderRow[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({ entity: "order", fields: TRACKING_FIELDS, filters });
  // Typed by .medusa/types once generated, `any` before: go through unknown.
  const rows: unknown[] = data;
  return rows as TrackedOrderRow[];
}
