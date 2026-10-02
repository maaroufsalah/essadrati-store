"use client";

import { Check, Eye, ShoppingBag } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

// The modal code loads on first use only: catalog pages stay light.
const QuickViewDialog = dynamic(
  () => import("./quick-view-dialog").then((mod) => mod.QuickViewDialog),
  {
    ssr: false,
  },
);

export interface CardProduct {
  handle: string;
  title: string;
  /** Set when the product has a single variant: added straight from the card. */
  directVariantId: string | null;
  price: number | null;
}

type AddState = "idle" | "adding" | "done" | "error";

const ROUND =
  "relative z-10 inline-flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-60";

/** Quick view button, over the product image (always visible on touch screens). */
export function QuickViewButton({ product }: { product: CardProduct }) {
  const t = useTranslations("product");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("quickView", { product: product.title })}
        aria-haspopup="dialog"
        className={cn(
          ROUND,
          "bg-card/90 text-card-fg shadow-soft hover:bg-card absolute end-3 top-3 backdrop-blur",
          "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100",
        )}
      >
        <Eye className="size-5" aria-hidden />
      </button>
      {open ? (
        <QuickViewDialog
          handle={product.handle}
          onClose={(added) => {
            setOpen(false);
            // Mounted on demand, the dialog has no Radix trigger to return the focus to;
            // wait for its focus scope to unmount first.
            if (!added) window.setTimeout(() => button.current?.focus(), 0);
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Add to cart from the card. A single-variant product is added at once,
 * with an animated confirmation; otherwise the quick view opens to pick the
 * weight. The cart drawer opens on success (cart provider). The icon swap
 * and the error shake are CSS animations, off with reduced motion.
 */
export function AddToCartButton({ product }: { product: CardProduct }) {
  const t = useTranslations();
  const cart = useCart();
  const [state, setState] = useState<AddState>("idle");
  const [choosing, setChoosing] = useState(false);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state !== "done" && state !== "error") return;
    const timer = window.setTimeout(() => setState("idle"), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);

  const add = async () => {
    if (!product.directVariantId) {
      setChoosing(true);
      return;
    }
    setState("adding");
    const ok = await cart.add({
      variantId: product.directVariantId,
      quantity: 1,
      title: product.title,
      variantTitle: "",
      price: product.price ?? 0,
    });
    setState(ok ? "done" : "error");
  };

  const label =
    state === "done"
      ? t("cart.added")
      : state === "adding"
        ? t("cart.adding")
        : t("product.addNamed", { product: product.title });

  // CSS animations (tw-animate): no motion runtime hydrated in every card.
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => void add()}
        disabled={state === "adding"}
        aria-label={label}
        aria-live="polite"
        className={cn(
          ROUND,
          "active:scale-90 motion-reduce:active:scale-100",
          state === "done" ? "bg-success text-bg" : "bg-primary text-primary-fg hover:opacity-90",
          state === "error" && "animate-[card-shake_0.35s_ease-in-out]",
        )}
      >
        {state === "done" ? (
          <Check
            key="done"
            className="animate-in zoom-in-50 spin-in-12 size-5 duration-300"
            strokeWidth={3}
            aria-hidden
          />
        ) : (
          <ShoppingBag
            key="idle"
            className={cn(
              "animate-in zoom-in-75 size-5 duration-200",
              state === "adding" && "animate-pulse",
            )}
            aria-hidden
          />
        )}
      </button>
      {choosing ? (
        <QuickViewDialog
          handle={product.handle}
          onClose={(added) => {
            setChoosing(false);
            if (!added) window.setTimeout(() => button.current?.focus(), 0);
          }}
        />
      ) : null}
    </>
  );
}
