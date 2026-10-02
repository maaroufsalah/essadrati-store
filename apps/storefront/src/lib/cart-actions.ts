"use server";

import type { HttpTypes } from "@nocido/api-client";
import { isLocale, type Locale, toMedusaLocale } from "@nocido/types";
import { cookies } from "next/headers";
import { CART_COOKIE } from "./cart-cookie";
import { getRegionId, storeClient } from "./catalog";
import { getStoreSettings } from "./settings";
import { type CartView, EMPTY_CART, toCartView } from "./cart-view";

const CART_FIELDS =
  "id,locale,currency_code,item_total,*items,items.product_handle,items.product.handle";
const MAX_QUANTITY = 20;

const asLocale = (locale: string): Locale => (isLocale(locale) ? locale : "ar");

async function client(locale: string) {
  return storeClient(asLocale(locale));
}

/** Medusa locale tag of the cart: line item titles are translated into it. */
async function cartLocale(locale: string): Promise<string> {
  const settings = await getStoreSettings();
  return toMedusaLocale(asLocale(locale), settings.contact.country);
}

async function cartId(): Promise<string | null> {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

async function setCartCookie(id: string): Promise<void> {
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCart(): Promise<void> {
  (await cookies()).delete(CART_COOKIE);
}

async function retrieve(locale: string, id: string): Promise<HttpTypes.StoreCart | null> {
  try {
    const { cart } = await (
      await client(locale)
    ).sdk.client.fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      query: { fields: CART_FIELDS },
      cache: "no-store",
    });
    // A completed cart became an order: start a new one.
    if (cart.completed_at) return null;
    const wanted = await cartLocale(locale);
    // `locale` is returned by Medusa 2.12+ but missing from the HTTP types.
    if ((cart as HttpTypes.StoreCart & { locale?: string | null }).locale === wanted) return cart;
    // Language switched: Medusa re-translates the line items.
    const updated = await (
      await client(locale)
    ).sdk.client.fetch<HttpTypes.StoreCartResponse>(`/store/carts/${id}`, {
      method: "POST",
      body: { locale: wanted },
      query: { fields: CART_FIELDS },
      cache: "no-store",
    });
    return updated.cart;
  } catch {
    return null;
  }
}

/** Current cart, or the empty cart. Never throws. */
export async function getCart(locale: string): Promise<CartView> {
  const id = await cartId();
  if (!id) return EMPTY_CART;
  const cart = await retrieve(locale, id);
  return cart ? toCartView(cart) : EMPTY_CART;
}

async function ensureCart(locale: string): Promise<string> {
  const existing = await cartId();
  if (existing && (await retrieve(locale, existing))) return existing;
  const regionId = await getRegionId();
  const { cart } = await (
    await client(locale)
  ).sdk.client.fetch<HttpTypes.StoreCartResponse>("/store/carts", {
    method: "POST",
    body: { region_id: regionId ?? undefined, locale: await cartLocale(locale) },
    cache: "no-store",
  });
  await setCartCookie(cart.id);
  return cart.id;
}

export type CartResult = { ok: true; cart: CartView } | { ok: false; cart: CartView };

async function mutate(locale: string, run: (id: string) => Promise<unknown>): Promise<CartResult> {
  try {
    const id = await ensureCart(locale);
    await run(id);
    return { ok: true, cart: await getCart(locale) };
  } catch (error) {
    console.error("[cart] update failed", error);
    return { ok: false, cart: await getCart(locale) };
  }
}

export async function addToCart(
  locale: string,
  variantId: string,
  quantity: number,
): Promise<CartResult> {
  const safeQuantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
  return mutate(locale, async (id) =>
    (await client(locale)).sdk.client.fetch(`/store/carts/${id}/line-items`, {
      method: "POST",
      body: { variant_id: variantId, quantity: safeQuantity },
      cache: "no-store",
    }),
  );
}

export async function updateCartLine(
  locale: string,
  lineId: string,
  quantity: number,
): Promise<CartResult> {
  if (quantity <= 0) return removeCartLine(locale, lineId);
  const safeQuantity = Math.min(MAX_QUANTITY, Math.floor(quantity));
  return mutate(locale, async (id) =>
    (await client(locale)).sdk.client.fetch(`/store/carts/${id}/line-items/${lineId}`, {
      method: "POST",
      body: { quantity: safeQuantity },
      cache: "no-store",
    }),
  );
}

export async function removeCartLine(locale: string, lineId: string): Promise<CartResult> {
  return mutate(locale, async (id) =>
    (await client(locale)).sdk.client.fetch(`/store/carts/${id}/line-items/${lineId}`, {
      method: "DELETE",
      cache: "no-store",
    }),
  );
}
