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
