"use server";

import { KIT_ROUTES, PUBLISHABLE_KEY_HEADER } from "@nocido/api-client";
import { codOrderInputSchema, isLocale } from "@nocido/types";
import { cookies } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { CART_COOKIE } from "./cart-cookie";
import { publicEnv } from "./env";
import { type CodErrorKey, type CodFormState, codErrorKey } from "./cod-form";
import { medusaServerUrl } from "./server-env";

interface PlacedOrder {
  id: string;
}

type SubmitResult = { ok: true; orderId: string } | { ok: false; state: CodFormState };

function text(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

const failed = (state: CodFormState): SubmitResult => ({ ok: false, state });
const GENERIC: CodFormState = { status: "error", fieldErrors: {}, formError: "generic" };

/**
 * Places a cash on delivery order through the backend workflow. Fees are
 * computed there from the city: nothing price-related comes from the form.
 */
async function submitCodOrder(form: FormData): Promise<SubmitResult> {
  // Bots fill every field; people never see this one.
  if (text(form, "website")) return failed(GENERIC);

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
    return failed({ status: "error", fieldErrors });
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
    if (response.ok && body.order) return { ok: true, orderId: body.order.id };
    const fieldErrors: Partial<Record<string, CodErrorKey>> = {};
    for (const issue of body.issues ?? []) {
      fieldErrors[issue.path.split(".").at(-1) ?? "form"] = codErrorKey(issue.code);
    }
    return failed({ status: "error", fieldErrors, formError: codErrorKey(body.message) });
  } catch (error) {
    console.error("[cod] order failed", error);
    return failed(GENERIC);
  }
}

/** Thank you page of the order, in the form language. Works without JavaScript too. */
function toThanks(form: FormData, orderId: string): never {
  const locale = text(form, "locale");
  return redirect({
    href: `/order/${orderId}/thanks`,
    locale: isLocale(locale) ? locale : "ar",
  });
}

/** One-step product form (`variant_id` + `quantity`). */
export async function placeCodOrder(
  _previous: CodFormState,
  form: FormData,
): Promise<CodFormState> {
  const result = await submitCodOrder(form);
  return result.ok ? toThanks(form, result.orderId) : result.state;
}

/**
 * Checkout of the current cart. The cart id comes from the httpOnly cookie,
 * never from the form; the cookie is cleared once the order exists.
 */
export async function placeCheckoutOrder(
  _previous: CodFormState,
  form: FormData,
): Promise<CodFormState> {
  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  if (!cartId) return GENERIC;
  form.set("cart_id", cartId);
  form.delete("variant_id");
  const result = await submitCodOrder(form);
  if (!result.ok) return result.state;
  (await cookies()).delete(CART_COOKIE);
  return toThanks(form, result.orderId);
}
