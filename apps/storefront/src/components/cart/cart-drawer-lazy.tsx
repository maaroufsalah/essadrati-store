"use client";

import dynamic from "next/dynamic";
import { useCart } from "./cart-provider";

const CartDrawer = dynamic(() => import("./cart-drawer").then((module) => module.CartDrawer), {
  ssr: false,
});

/** Loads the drawer (and its dialog code) the first time the cart is opened. */
export function CartDrawerLazy() {
  const { opened } = useCart();
  return opened ? <CartDrawer /> : null;
}
