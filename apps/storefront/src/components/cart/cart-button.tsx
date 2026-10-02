"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { useCart } from "./cart-provider";

/** Header cart button with the item count. */
export function CartButton() {
  const t = useTranslations("cart");
  const { cart, setOpen, format } = useCart();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setOpen(true)}
      aria-label={t("open", { count: cart.count })}
    >
      <ShoppingBag aria-hidden />
      {cart.count > 0 ? (
        <span
          aria-hidden
          className="bg-primary text-primary-fg absolute end-1 top-1 flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] leading-5 font-bold tabular-nums"
        >
          {formatNumber(cart.count, format)}
        </span>
      ) : null}
    </Button>
  );
}
