import { type CodOrder, codOrderInputSchema, localizedStringSchema } from "@nocido/types";
import { z } from "zod";

/** POST /store/cod/orders: shared with the storefront (@nocido/types). */
export const placeCodOrderBodySchema = codOrderInputSchema;
export type PlaceCodOrderBody = CodOrder;

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
