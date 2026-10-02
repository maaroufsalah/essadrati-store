"use server";

import { KIT_ROUTES, PUBLISHABLE_KEY_HEADER } from "@nocido/api-client";
import { codOrderInputSchema, isLocale } from "@nocido/types";
import { cookies } from "next/headers";
import { CART_COOKIE } from "./cart-cookie";
import { publicEnv } from "./env";
import { type CodErrorKey, type CodFormState, codErrorKey } from "./cod-form";
import { medusaServerUrl } from "./server-env";

interface PlacedOrder {
  id: string;
  display_id: number;
  total: number;
}

function text(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Places a cash on delivery order through the backend workflow. Fees are
 * computed there from the city: nothing price-related comes from the form.
 * Used by the one-step product form (`variant_id` + `quantity`) and by the
 * checkout (`cart_id`).
 */
export async function placeCodOrder(
  _previous: CodFormState,
  form: FormData,
): Promise<CodFormState> {
  // Bots fill every field; people never see this one.
  if (text(form, "website")) return { status: "error", fieldErrors: {}, formError: "generic" };

  const locale = text(form, "locale");
  const cartId = text(form, "cart_id");
  const variantId = text(form, "variant_id");
  const input = {
    ...(cartId
      ? { cart_id: cartId }
      : {
          items: variantId
            ? [{ variant_id: variantId, quantity: Number(text(form, "quantity") ?? "1") }]
            : [],
        }),
    customer: { name: text(form, "name") ?? "", phone: text(form, "phone") ?? "" },
    city_id: text(form, "city_id") ?? "",
    address: text(form, "address"),
    locale: isLocale(locale) ? locale : undefined,
  };

  const parsed = codOrderInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<string, CodErrorKey>> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path.at(-1) ?? "form");
      fieldErrors[field === "variant_id" ? "items" : field] ??= codErrorKey(issue.message);
    }
    return { status: "error", fieldErrors };
  }

  // One key per form session: a retry after a timeout returns the same order.
  const idempotencyKey = text(form, "idempotency_key");

  try {
    const response = await fetch(`${medusaServerUrl()}${KIT_ROUTES.codOrders}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [PUBLISHABLE_KEY_HEADER]: publicEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
        ...(idempotencyKey && /^[A-Za-z0-9-]{16,64}$/.test(idempotencyKey)
          ? { "idempotency-key": idempotencyKey }
          : {}),
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    const body = (await response.json().catch(() => ({}))) as {
      order?: PlacedOrder;
      message?: string;
      issues?: { path: string; code: string }[];
    };
    if (response.ok && body.order) {
      return {
        status: "success",
        order: {
          id: body.order.id,
          displayId: body.order.display_id,
          total: Number(body.order.total),
          phone: parsed.data.customer.phone,
        },
      };
    }
    const fieldErrors: Partial<Record<string, CodErrorKey>> = {};
    for (const issue of body.issues ?? []) {
      fieldErrors[issue.path.split(".").at(-1) ?? "form"] = codErrorKey(issue.code);
    }
    return { status: "error", fieldErrors, formError: codErrorKey(body.message) };
  } catch (error) {
    console.error("[cod] order failed", error);
    return { status: "error", fieldErrors: {}, formError: "generic" };
  }
}

/**
 * Checkout of the current cart. The cart id comes from the httpOnly cookie,
 * never from the form; the cookie is cleared once the order exists.
 */
export async function placeCheckoutOrder(
  previous: CodFormState,
  form: FormData,
): Promise<CodFormState> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  if (!cartId) return { status: "error", fieldErrors: {}, formError: "generic" };
  form.set("cart_id", cartId);
  form.delete("variant_id");
  const result = await placeCodOrder(previous, form);
  if (result.status === "success") (await cookies()).delete(CART_COOKIE);
  return result;
}
