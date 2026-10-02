"use client";

import type { CodCity, Locale } from "@nocido/types";
import { MessageCircle, Minus, Plus, ShieldCheck, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { type CodFieldValues, CodFields, EMPTY_COD_FIELDS } from "@/components/cod/cod-fields";
import { CodSummary } from "@/components/cod/cod-summary";
import { Price } from "@/components/commerce/price";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { placeCodOrder } from "@/lib/cod-action";
import { IDLE } from "@/lib/cod-form";
import { formatNumber, formatPrice, type StoreFormat } from "@/lib/format";
import type { VariantView } from "@/lib/product-detail";

interface PurchaseFormProps {
  locale: Locale;
  title: string;
  variants: VariantView[];
  cities: CodCity[];
  format: StoreFormat;
  freeShippingThreshold: number | null;
  codEnabled: boolean;
  /** wa.me number (digits only) when WhatsApp ordering is enabled. */
  whatsappNumber: string | null;
}

const MAX_QUANTITY = 20;

/**
 * Weight choice, price, add to cart and the one-step cash on delivery form
 * (name, phone, city, quantity). The total shown is an estimate; the
 * backend computes the real delivery fee from the city.
 */
export function PurchaseForm({
  locale,
  title,
  variants,
  cities,
  format,
  freeShippingThreshold,
  codEnabled,
  whatsappNumber,
}: PurchaseFormProps) {
  const t = useTranslations();
  const id = useId();
  const cart = useCart();
  const [state, action, pending] = useActionState(placeCodOrder, IDLE);
  const [, startTransition] = useTransition();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [fields, setFields] = useState<CodFieldValues>(EMPTY_COD_FIELDS);
  const [adding, setAdding] = useState(false);
  const [formVisible, setFormVisible] = useState(true);
  // Same key for every attempt of this form: retries never duplicate the order.
  // Created on first submit (client only) to keep server and client markup equal.
  const idempotencyKey = useRef<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const variant = variants.find((candidate) => candidate.id === variantId) ?? variants[0];
  const city = cities.find((candidate) => candidate.id === fields.cityId) ?? null;
  const unitPrice = variant?.amount ?? 0;
  const subtotal = unitPrice * quantity;
  const errors = state.status === "error" ? state.fieldErrors : {};

  // Sticky mobile bar shown while the order form is out of view.
  useEffect(() => {
    const node = formRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) =>
      setFormVisible(entry?.isIntersecting ?? true),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // ViewContent once per product view.
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current || !variant) return;
    viewed.current = true;
    track("ViewContent", {
      currency: format.currency,
      value: unitPrice,
      items: [
        { id: variant.id, name: title, variant: variant.label, price: unitPrice, quantity: 1 },
      ],
    });
  }, [format.currency, title, unitPrice, variant]);

  const whatsappHref =
    whatsappNumber && variant
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          t("productPage.whatsappMessage", { product: title, variant: variant.label, quantity }),
        )}`
      : null;

  const addToCart = async () => {
    if (!variant) return;
    setAdding(true);
    await cart.add({
      variantId: variant.id,
      quantity,
      title,
      variantTitle: variant.label,
      price: unitPrice,
    });
    setAdding(false);
  };

  const quantityStepper = (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-quantity`} className="text-fg text-sm font-medium">
        {t("cod.quantity")}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-quantity`}
        className="rounded-base border-border flex h-12 items-center border"
      >
        <button
          type="button"
          onClick={() => setQuantity((value) => Math.max(1, value - 1))}
          disabled={quantity <= 1}
          aria-label={t("cod.decrease")}
          className="touch-target text-fg flex items-center justify-center disabled:opacity-40"
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <output aria-live="polite" className="text-fg w-8 text-center font-semibold tabular-nums">
          {formatNumber(quantity, format)}
        </output>
        <button
          type="button"
          onClick={() => setQuantity((value) => Math.min(MAX_QUANTITY, value + 1))}
          disabled={quantity >= MAX_QUANTITY}
          aria-label={t("cod.increase")}
          className="touch-target text-fg flex items-center justify-center disabled:opacity-40"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {variant?.amount !== null && variant?.amount !== undefined ? (
        <Price
          amount={variant.amount}
          original={variant.original}
          format={format}
          originalLabel={t("product.originalPrice")}
          size="lg"
        />
      ) : null}

      <div ref={formRef}>
        <form
          id="cod-form"
          action={action}
          onSubmit={(event) => {
            // React resets uncontrolled forms after a form action; dispatching
            // manually keeps the input when the order is refused. Without
            // JavaScript the native form action still works.
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            idempotencyKey.current ??= crypto.randomUUID();
            data.set("idempotency_key", idempotencyKey.current);
            startTransition(() => action(data));
          }}
          className="flex scroll-mt-24 flex-col gap-6"
          noValidate
        >
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="quantity" value={quantity} />
          {/* Honeypot: hidden from people and assistive technologies. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            className="hidden"
          />

          {variants.length > 1 ? (
            <fieldset className="flex flex-col gap-3">
              <legend className="text-fg mb-2 text-sm font-semibold">
                {t("productPage.variant")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {variants.map((candidate) => (
                  <label
                    key={candidate.id}
                    className="rounded-button border-border has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-fg has-[:focus-visible]:ring-ring touch-target inline-flex cursor-pointer items-center gap-2 border px-5 text-sm font-semibold has-[:focus-visible]:ring-2"
                  >
                    <input
                      type="radio"
                      name="variant_id"
                      value={candidate.id}
                      checked={candidate.id === variantId}
                      onChange={() => setVariantId(candidate.id)}
                      className="sr-only"
                    />
                    <bdi dir="ltr">{candidate.label}</bdi>
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <input type="hidden" name="variant_id" value={variantId} />
          )}

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => void addToCart()}
            disabled={adding || !variant}
          >
            <ShoppingBag aria-hidden />
            {adding ? t("cart.adding") : t("cart.add")}
          </Button>

          {codEnabled ? (
            <div className="rounded-card border-border bg-card flex flex-col gap-4 border p-5">
              <h2 className="text-card-fg text-lg font-bold">{t("cod.title")}</h2>
              <CodFields
                locale={locale}
                cities={cities}
                values={fields}
                onChange={setFields}
                errors={errors}
                cityAside={quantityStepper}
              />
              <CodSummary
                subtotal={subtotal}
                city={city}
                freeShippingThreshold={freeShippingThreshold}
                format={format}
              />
              {state.status === "error" && state.formError ? (
                <p role="alert" className="rounded-base bg-danger/10 text-danger p-3 text-sm">
                  {t(`cod.errors.${state.formError}`)}
                </p>
              ) : null}
              <Button type="submit" size="lg" disabled={pending} className="w-full">
                {pending ? t("cod.submitting") : t("cod.submit")}
              </Button>
              <p className="text-muted-fg flex items-center justify-center gap-2 text-xs">
                <ShieldCheck className="size-4" aria-hidden />
                {t("cod.secure")}
              </p>
            </div>
          ) : null}
        </form>
      </div>

      {whatsappHref ? (
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden />
            {t("productPage.whatsapp")}
          </a>
        </Button>
      ) : null}

      {codEnabled && !formVisible ? (
        <div className="border-border bg-card/95 pb-safe fixed inset-x-0 bottom-0 z-30 border-t backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-card-fg truncate text-sm font-semibold">{title}</span>
              <span className="text-card-fg text-base font-bold tabular-nums">
                {formatPrice(subtotal, format)}
              </span>
            </div>
            <Button
              size="md"
              onClick={() =>
                document
                  .getElementById("cod-form")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            >
              {t("productPage.stickyCta")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
