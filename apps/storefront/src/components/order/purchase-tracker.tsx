"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { track, type TrackPayload } from "@/lib/analytics";

const storageKey = (orderId: string) => `nocido_purchase_${orderId}`;

/**
 * Fires Purchase once per order, with the order id as event id so the
 * pixels and a later server event deduplicate. A reload of the thank you
 * page does not count twice. Also reloads the cart, emptied by a checkout.
 */
export function PurchaseTracker({ payload }: { payload: TrackPayload & { orderId: string } }) {
  const { refresh } = useCart();

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const key = storageKey(payload.orderId);
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {
      // Storage blocked (private mode): the 2 s dedupe still applies.
    }
    track("Purchase", payload, payload.orderId);
  }, [payload]);

  return null;
}
