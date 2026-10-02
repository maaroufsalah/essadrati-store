import type { HttpTypes } from "@nocido/api-client";

/** Serializable cart for client components (drawer, checkout). */
export interface CartLine {
  id: string;
  variantId: string;
  productHandle: string | null;
  title: string;
  variantTitle: string;
  thumbnail: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CartView {
  id: string;
  currency: string;
  lines: CartLine[];
  count: number;
  subtotal: number;
}

export const EMPTY_CART: CartView = { id: "", currency: "", lines: [], count: 0, subtotal: 0 };

const amount = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function toCartView(cart: HttpTypes.StoreCart): CartView {
  const lines = (cart.items ?? [])
    .map((item): CartLine => ({
      id: item.id,
      variantId: item.variant_id ?? "",
      productHandle: item.product_handle ?? item.product?.handle ?? null,
      title: item.product_title ?? item.title,
      variantTitle: item.variant_title ?? "",
      thumbnail: item.thumbnail ?? null,
      quantity: item.quantity,
      unitPrice: amount(item.unit_price),
      total: amount(item.total ?? amount(item.unit_price) * item.quantity),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return {
    id: cart.id,
    currency: cart.currency_code,
    lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: amount(cart.item_total ?? lines.reduce((sum, line) => sum + line.total, 0)),
  };
}

/** Share of the free delivery threshold reached, between 0 and 1. */
export function freeShippingProgress(subtotal: number, threshold: number | null): number | null {
  if (threshold === null || threshold <= 0) return null;
  return Math.min(1, subtotal / threshold);
}
