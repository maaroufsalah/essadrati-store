"use client";

import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductImage } from "@/components/commerce/product-image";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { freeShippingProgress } from "@/lib/cart-view";
import { formatNumber, formatPrice } from "@/lib/format";
import { useCart } from "./cart-provider";

/** Cart drawer, opening from the reading end side. */
export function CartDrawer() {
  const t = useTranslations();
  const { cart, open, setOpen, update, remove, pending, format, freeShippingThreshold, error } =
    useCart();
  const progress = freeShippingProgress(cart.subtotal, freeShippingThreshold);
  const remaining =
    freeShippingThreshold !== null ? Math.max(0, freeShippingThreshold - cart.subtotal) : 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="end"
        closeLabel={t("common.close")}
        aria-describedby={undefined}
        className="flex flex-col"
      >
        <SheetHeader>
          <SheetTitle>
            {t("cart.title")}
            {cart.count > 0 ? ` (${formatNumber(cart.count, format)})` : ""}
          </SheetTitle>
        </SheetHeader>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
            <ShoppingBag className="text-muted-fg size-12" aria-hidden />
            <p className="text-muted-fg">{t("cart.empty")}</p>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cart.continue")}
            </Button>
          </div>
        ) : (
          <>
            {progress !== null ? (
              <div className="mx-5 flex flex-col gap-2">
                <p className="text-card-fg text-sm" aria-live="polite">
                  {remaining > 0
                    ? t("cart.freeShippingRemaining", { amount: formatPrice(remaining, format) })
                    : t("cart.freeShippingReached")}
                </p>
                <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            ) : null}

            <ul
              aria-busy={pending}
              className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4"
            >
              {cart.lines.map((line) => (
                <li key={line.id} className="flex gap-3">
                  <div className="rounded-base w-20 shrink-0 overflow-hidden">
                    <ProductImage src={line.thumbnail} alt="" sizes="80px" />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {line.productHandle ? (
                      <Link
                        href={`/p/${line.productHandle}`}
                        onClick={() => setOpen(false)}
                        className="text-card-fg line-clamp-2 text-sm font-semibold hover:underline"
                      >
                        {line.title}
                      </Link>
                    ) : (
                      <span className="text-card-fg line-clamp-2 text-sm font-semibold">
                        {line.title}
                      </span>
                    )}
                    <span className="text-muted-fg text-xs">
                      <bdi dir="ltr">{line.variantTitle}</bdi>
                    </span>
                    <div className="mt-auto flex items-center justify-between gap-2">
                      <div
                        className="rounded-base border-border flex items-center border"
                        role="group"
                        aria-label={t("cod.quantity")}
                      >
                        <button
                          type="button"
                          onClick={() => update(line.id, line.quantity - 1)}
                          aria-label={t("cod.decrease")}
                          className="touch-target flex items-center justify-center"
                          disabled={pending}
                        >
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold tabular-nums">
                          {formatNumber(line.quantity, format)}
                        </span>
                        <button
                          type="button"
                          onClick={() => update(line.id, line.quantity + 1)}
                          aria-label={t("cod.increase")}
                          className="touch-target flex items-center justify-center"
                          disabled={pending}
                        >
                          <Plus className="size-4" aria-hidden />
                        </button>
                      </div>
                      <span className="text-card-fg text-sm font-bold tabular-nums">
                        {formatPrice(line.total, format)}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(line.id)}
                        aria-label={t("cart.remove", { product: line.title })}
                        className="touch-target text-muted-fg hover:text-danger flex items-center justify-center"
                        disabled={pending}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-border pb-safe flex flex-col gap-3 border-t p-5">
              {error ? (
                <p role="alert" className="text-danger text-sm">
                  {t("cart.error")}
                </p>
              ) : null}
              <div className="flex justify-between text-base font-bold">
                <span>{t("cod.subtotal")}</span>
                <span className="tabular-nums">{formatPrice(cart.subtotal, format)}</span>
              </div>
              <Button asChild size="lg">
                <Link href="/checkout" onClick={() => setOpen(false)}>
                  {t("cart.checkout")}
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
