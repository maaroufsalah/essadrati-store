"use client";

import { useLocale } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import { track } from "@/lib/analytics";
import {
  addToCart,
  type CartResult,
  getCart,
  removeCartLine,
  updateCartLine,
} from "@/lib/cart-actions";
import { type CartView, EMPTY_CART } from "@/lib/cart-view";
import type { StoreFormat } from "@/lib/format";

interface AddInput {
  variantId: string;
  quantity: number;
  /** For analytics only. */
  title: string;
  variantTitle: string;
  price: number;
}

interface CartContextValue {
  cart: CartView;
  loaded: boolean;
  pending: boolean;
  open: boolean;
  error: boolean;
  setOpen: (open: boolean) => void;
  add: (input: AddInput) => Promise<boolean>;
  update: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  /** Called after a COD checkout succeeds: the cart became an order. */
  /** Reloads the cart from the server (after an order, the cookie is gone). */
  refresh: () => void;
  format: StoreFormat;
  freeShippingThreshold: number | null;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}

/**
 * Cart state for the drawer, the header badge and the checkout. The cart is
 * read client-side after load so cached pages (ISR) stay static.
 */
export function CartProvider({
  children,
  format,
  freeShippingThreshold,
}: {
  children: ReactNode;
  format: StoreFormat;
  freeShippingThreshold: number | null;
}) {
  const locale = useLocale();
  const [cart, setCart] = useState<CartView>(EMPTY_CART);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void getCart(locale).then((current) => {
      if (!active) return;
      setCart(current);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [locale, version]);
  const refresh = useCallback(() => setVersion((value) => value + 1), []);

  const apply = useCallback((result: CartResult) => {
    setCart(result.cart);
    setError(!result.ok);
    return result.ok;
  }, []);

  const add = useCallback(
    async (input: AddInput) => {
      const ok = apply(await addToCart(locale, input.variantId, input.quantity));
      if (ok) {
        setOpen(true);
        track("AddToCart", {
          currency: format.currency,
          value: input.price * input.quantity,
          items: [
            {
              id: input.variantId,
              name: input.title,
              variant: input.variantTitle,
              price: input.price,
              quantity: input.quantity,
            },
          ],
        });
      }
      return ok;
    },
    [apply, format.currency, locale],
  );

  const update = useCallback(
    (lineId: string, quantity: number) =>
      startTransition(async () => {
        apply(await updateCartLine(locale, lineId, quantity));
      }),
    [apply, locale],
  );

  const remove = useCallback(
    (lineId: string) =>
      startTransition(async () => {
        apply(await removeCartLine(locale, lineId));
      }),
    [apply, locale],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loaded,
      pending,
      open,
      error,
      setOpen,
      add,
      update,
      remove,
      refresh,
      format,
      freeShippingThreshold,
    }),
    [
      add,
      cart,
      error,
      format,
      freeShippingThreshold,
      loaded,
      open,
      pending,
      refresh,
      remove,
      update,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
