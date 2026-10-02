"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { Price } from "@/components/commerce/price";
import { ImagePlaceholder } from "@/components/commerce/product-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import type { ProductDetail } from "@/lib/product-detail";
import { isSvg } from "@/lib/product-view";
import { loadQuickView } from "@/lib/quick-view-action";
import { cn } from "@/lib/utils";

/**
 * Quick view of a product card: main photo, weight choice, price and add to
 * cart, with a link to the full page. Radix Dialog traps the focus, closes
 * on Escape and labels the modal; the product loads when it opens.
 */
export function QuickViewDialog({
  handle,
  onClose,
}: {
  handle: string;
  /** `added`: the product went to the cart (the cart drawer takes the focus). */
  onClose: (added: boolean) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const cart = useCart();
  const groupId = useId();
  const [detail, setDetail] = useState<ProductDetail | null | "missing">(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    loadQuickView(locale, handle)
      .then((loaded) => {
        if (active) setDetail(loaded ?? "missing");
      })
      .catch(() => active && setDetail("missing"));
    return () => {
      active = false;
    };
  }, [handle, locale]);

  const product = detail && detail !== "missing" ? detail : null;
  const variant =
    product?.variants.find((candidate) => candidate.id === variantId) ?? product?.variants[0];

  const add = async () => {
    if (!product || !variant) return;
    setAdding(true);
    const ok = await cart.add({
      variantId: variant.id,
      quantity: 1,
      title: product.title,
      variantTitle: variant.label,
      price: variant.amount ?? 0,
    });
    setAdding(false);
    if (ok) onClose(true);
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose(false)}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-fg/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="rounded-card bg-card text-card-fg shadow-card data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed inset-x-4 top-1/2 z-50 mx-auto grid max-h-[90dvh] max-w-3xl -translate-y-1/2 overflow-y-auto sm:grid-cols-2"
        >
          <div className="bg-muted relative aspect-square sm:aspect-auto sm:min-h-full">
            {product?.images[0] ? (
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                sizes="(min-width: 640px) 384px, 90vw"
                unoptimized={isSvg(product.images[0])}
                className="object-cover"
              />
            ) : product ? (
              <ImagePlaceholder className="absolute inset-0" />
            ) : (
              <Skeleton className="absolute inset-0 rounded-none" />
            )}
          </div>

          <div className="flex flex-col gap-4 p-5 sm:p-6">
            {product ? (
              <>
                <div className="flex flex-col gap-1 pe-10">
                  <Dialog.Title className="font-display text-2xl leading-tight font-bold">
                    {product.title}
                  </Dialog.Title>
                  {product.subtitle ? (
                    <p className="text-muted-fg text-sm">{product.subtitle}</p>
                  ) : null}
                </div>
                {variant?.amount !== null && variant?.amount !== undefined ? (
                  <Price
                    amount={variant.amount}
                    original={variant.original}
                    format={cart.format}
                    originalLabel={t("product.originalPrice")}
                    className="text-xl"
                  />
                ) : null}
                {product.variants.length > 1 ? (
                  <fieldset className="flex flex-col gap-2">
                    <legend className="text-fg mb-2 text-sm font-semibold">
                      {t("productPage.variant")}
                    </legend>
                    <div className="flex flex-wrap gap-2" role="radiogroup">
                      {product.variants.map((item) => (
                        <label
                          key={item.id}
                          htmlFor={`${groupId}-${item.id}`}
                          className="rounded-button border-border has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-fg has-[:focus-visible]:ring-ring/40 touch-target inline-flex cursor-pointer items-center border px-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-4"
                        >
                          <input
                            id={`${groupId}-${item.id}`}
                            type="radio"
                            name={`${groupId}-variant`}
                            value={item.id}
                            checked={item.id === variant?.id}
                            onChange={() => setVariantId(item.id)}
                            className="sr-only"
                          />
                          <bdi dir="ltr">{item.label}</bdi>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                {product.description ? (
                  <p className="text-muted-fg line-clamp-4 text-sm leading-relaxed">
                    {product.description}
                  </p>
                ) : null}
                <div className="mt-auto flex flex-col gap-3 pt-2">
                  <Button size="lg" onClick={() => void add()} disabled={adding || !variant}>
                    {adding ? t("cart.adding") : t("cart.add")}
                  </Button>
                  <Link
                    href={`/p/${product.handle}`}
                    className="text-accent touch-target inline-flex items-center justify-center gap-1 text-sm font-semibold hover:underline"
                  >
                    {t("product.fullDetails")}
                    <ArrowRight className="size-4 rtl:hidden" aria-hidden />
                    <ArrowLeft className="size-4 ltr:hidden" aria-hidden />
                  </Link>
                </div>
              </>
            ) : detail === "missing" ? (
              <Dialog.Title className="text-muted-fg py-10 text-center">
                {t("product.quickViewError")}
              </Dialog.Title>
            ) : (
              <div className={cn("flex flex-col gap-3")} aria-busy>
                <Dialog.Title className="sr-only">{t("category.loading")}</Dialog.Title>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-11 w-full" />
              </div>
            )}
          </div>

          <Dialog.Close className="touch-target bg-card/90 text-muted-fg hover:text-fg absolute end-3 top-3 inline-flex items-center justify-center rounded-full">
            <X className="size-5" aria-hidden />
            <span className="sr-only">{t("common.close")}</span>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
