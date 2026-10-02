import { z } from "zod";
import { localeSchema, type LocalizedString } from "./locale";
import { moroccanPhoneSchema } from "./phone";

/**
 * Cash on delivery order, as sent by the storefront (product form or
 * checkout) to POST /store/cod/orders. Error messages are i18n keys.
 */
export const codOrderInputSchema = z
  .object({
    cart_id: z.string().min(1).optional(),
    items: z
      .array(
        z.object({
          variant_id: z.string().min(1),
          quantity: z.number().int().min(1, "cod.quantity.invalid").max(99, "cod.quantity.invalid"),
        }),
      )
      .min(1)
      .max(50)
      .optional(),
    customer: z.object({
      name: z.string().trim().min(2, "cod.name.invalid").max(120, "cod.name.invalid"),
      phone: moroccanPhoneSchema,
      /** Optional: order confirmation and status emails. */
      email: z
        .union([z.literal(""), z.email("cod.email.invalid").max(254, "cod.email.invalid")])
        .optional(),
    }),
    city_id: z.string().min(1, "cod.city.required"),
    address: z.string().trim().max(300).optional(),
    note: z.string().trim().max(500).optional(),
    locale: localeSchema.optional(),
  })
  .refine((body) => Boolean(body.cart_id) !== Boolean(body.items), {
    message: "cod.cartOrItems",
    path: ["items"],
  });
export type CodOrderInput = z.input<typeof codOrderInputSchema>;
export type CodOrder = z.output<typeof codOrderInputSchema>;

/** A city offered in the COD form (GET /store/cities). */
export interface CodCity {
  id: string;
  slug: string;
  name: LocalizedString;
  zone: string;
  fee: number;
  delivery_days_min: number;
  delivery_days_max: number;
}

export const COD_STATUSES = ["pending", "confirmed", "cancelled"] as const;
export type CodStatus = (typeof COD_STATUSES)[number];

/** Steps shown on the public order tracking page, in order. */
export const COD_TRACKING_STEPS = ["placed", "confirmed", "shipped", "delivered"] as const;
export type CodTrackingStep = (typeof COD_TRACKING_STEPS)[number];
export type CodTrackingState = CodTrackingStep | "cancelled";

export interface CodTrackingSource {
  createdAt: string;
  codStatus: CodStatus | null;
  codStatusAt: string | null;
  canceledAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface CodTimelineEntry {
  step: CodTrackingStep | "cancelled";
  at: string | null;
  done: boolean;
}

/**
 * Current state and timeline of a COD order. Delivery facts (shipped,
 * delivered) imply the earlier steps even when the phone confirmation was
 * skipped in the admin. A cancellation replaces the steps not reached.
 */
export function codTracking(source: CodTrackingSource): {
  state: CodTrackingState;
  timeline: CodTimelineEntry[];
} {
  const reached: Record<CodTrackingStep, string | null> = {
    placed: source.createdAt,
    confirmed: source.codStatus === "confirmed" ? source.codStatusAt : null,
    shipped: source.shippedAt,
    delivered: source.deliveredAt,
  };
  const lastIndex = COD_TRACKING_STEPS.reduce(
    (last, step, index) => (reached[step] ? index : last),
    0,
  );
  const cancelledAt =
    source.canceledAt ?? (source.codStatus === "cancelled" ? source.codStatusAt : null);
  const cancelled = Boolean(cancelledAt) || source.codStatus === "cancelled";

  const timeline: CodTimelineEntry[] = COD_TRACKING_STEPS.filter(
    (_, index) => !cancelled || index <= lastIndex,
  ).map((step, index) => ({ step, at: reached[step], done: index <= lastIndex }));
  if (cancelled) timeline.push({ step: "cancelled", at: cancelledAt, done: true });

  return {
    state: cancelled ? "cancelled" : (COD_TRACKING_STEPS[lastIndex] ?? "placed"),
    timeline,
  };
}

/** Public order tracking (GET /store/cod/orders/:id). No full name, phone or address. */
export interface CodOrderTracking {
  id: string;
  display_id: number;
  created_at: string;
  currency_code: string;
  item_total: number;
  shipping_total: number;
  total: number;
  state: CodTrackingState;
  timeline: CodTimelineEntry[];
  first_name: string;
  city_id: string | null;
  /** "+212 6•• ••• •78" style mask, enough for the customer to recognize it. */
  phone_masked: string;
  items: {
    id: string;
    variant_id: string | null;
    product_handle: string | null;
    title: string;
    variant_title: string | null;
    thumbnail: string | null;
    quantity: number;
    unit_price: number;
    total: number;
  }[];
}

/** POST /store/cod/orders/lookup: both the phone and the order number are required. */
export const codOrderLookupSchema = z.object({
  phone: moroccanPhoneSchema,
  display_id: z.coerce
    .number({ message: "order.number.invalid" })
    .int("order.number.invalid")
    .min(1, "order.number.invalid")
    .max(1_000_000_000, "order.number.invalid"),
});
export type CodOrderLookupInput = z.input<typeof codOrderLookupSchema>;

/** +212612345678 -> "+212 6•• ••• •78". */
export function maskPhone(e164: string): string {
  const national = e164.replace(/^\+212/, "");
  if (national.length !== 9) return "•".repeat(Math.max(0, e164.length - 2)) + e164.slice(-2);
  return `+212 ${national[0]}•• ••• •${national.slice(-2)}`;
}
