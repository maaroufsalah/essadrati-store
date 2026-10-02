import { localeSchema, localizedStringSchema, moroccanPhoneSchema } from "@nocido/types";
import { z } from "zod";

/** POST /store/cod/orders: the one-step product form and the checkout share it. */
export const placeCodOrderBodySchema = z
  .object({
    cart_id: z.string().min(1).optional(),
    items: z
      .array(
        z.object({
          variant_id: z.string().min(1),
          quantity: z.number().int().min(1).max(99),
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
export type PlaceCodOrderBody = z.output<typeof placeCodOrderBodySchema>;

const fee = z.number().min(0).max(100_000);
const days = z.number().int().min(0).max(60);

export const zoneBodySchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,64}$/, "zone.code.invalid"),
  name: localizedStringSchema,
  fee,
  delivery_days_min: days,
  delivery_days_max: days,
});

export const cityBodySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{2,64}$/, "city.slug.invalid"),
  name: localizedStringSchema,
  zone_id: z.string().min(1),
  fee: fee.nullable(),
  delivery_days_min: days.nullable(),
  delivery_days_max: days.nullable(),
  is_active: z.boolean(),
  rank: z.number().int().min(0).max(10_000),
});

export const cityImportBodySchema = z.object({ csv: z.string().min(1).max(1_000_000) });
