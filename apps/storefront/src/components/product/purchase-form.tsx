"use client";

import { type CodCity, type Locale, resolveLocalized } from "@nocido/types";
import { CheckCircle2, Minus, Plus, MessageCircle, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId, useRef, useState, useTransition } from "react";
import { Price } from "@/components/commerce/price";
import { Button } from "@/components/ui/button";
import { FieldMessage, Input, Label } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import { placeCodOrder } from "@/lib/cod-action";
import { estimateShipping, IDLE } from "@/lib/cod-form";
import { formatNumber, formatPrice, type StoreFormat } from "@/lib/format";
import type { VariantView } from "@/lib/product-detail";
import { cn } from "@/lib/utils";

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
 * Weight choice, price and the one-step cash on delivery form (name, phone,
 * city, quantity). The total shown is an estimate; the backend computes the
 * real delivery fee from the city.
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
  const [state, action, pending] = useActionState(placeCodOrder, IDLE);
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [cityId, setCityId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [, startTransition] = useTransition();
  // Same key for every attempt of this form: retries never duplicate the order.
  // Created on first submit (client only) to keep server and client markup equal.
  const idempotencyKey = useRef<string | null>(null);

  const variant = variants.find((candidate) => candidate.id === variantId) ?? variants[0];
  const city = cities.find((candidate) => candidate.id === cityId) ?? null;
  const subtotal = (variant?.amount ?? 0) * quantity;
  const shipping = estimateShipping(city?.fee ?? null, subtotal, freeShippingThreshold);
  const errors = state.status === "error" ? state.fieldErrors : {};
  const cityName = (candidate: CodCity) => resolveLocalized(candidate.name, locale, ["fr"]);

  const whatsappHref =
    whatsappNumber && variant
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
          t("productPage.whatsappMessage", { product: title, variant: variant.label, quantity }),
        )}`
      : null;

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-card border-success bg-card flex flex-col items-start gap-4 border-2 p-6"
      >
        <CheckCircle2 className="text-success size-10" aria-hidden />
        <h2 className="text-card-fg text-2xl font-bold">{t("cod.successTitle")}</h2>
        <p className="text-muted-fg">
          {t("cod.successText", {
            number: formatNumber(state.order.displayId, format, { useGrouping: false }),
            phone: state.order.phone,
          })}
        </p>
        <p className="text-card-fg text-lg font-bold">{formatPrice(state.order.total, format)}</p>
        <Button asChild variant="outline">
          <Link href="/">{t("cod.successContinue")}</Link>
        </Button>
      </div>
    );
  }

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

      <form
        action={action}
        onSubmit={(event) => {
          // React resets uncontrolled forms after a form action; dispatching
          // manually keeps what the customer typed when the order is refused.
          // Without JavaScript the native form action still works.
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          idempotencyKey.current ??= crypto.randomUUID();
          data.set("idempotency_key", idempotencyKey.current);
          startTransition(() => action(data));
        }}
        className="flex flex-col gap-6"
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

        {codEnabled ? (
          <div className="rounded-card border-border bg-card flex flex-col gap-4 border p-5">
            <h2 className="text-card-fg text-lg font-bold">{t("cod.title")}</h2>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-name`}>{t("cod.name")}</Label>
              <Input
                id={`${id}-name`}
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                required
                placeholder={t("cod.namePlaceholder")}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${id}-name-error` : undefined}
              />
              {errors.name ? (
                <FieldMessage id={`${id}-name-error`}>
                  {t(`cod.errors.${errors.name}`)}
                </FieldMessage>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${id}-phone`}>{t("cod.phone")}</Label>
              <Input
                id={`${id}-phone`}
                name="phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                required
                placeholder={t("cod.phonePlaceholder")}
                aria-invalid={errors.phone ? true : undefined}
                aria-describedby={`${id}-phone-hint${errors.phone ? ` ${id}-phone-error` : ""}`}
                className="text-start"
              />
              <p id={`${id}-phone-hint`} className="text-muted-fg text-xs">
                {t("cod.phoneHint")}
              </p>
              {errors.phone ? (
                <FieldMessage id={`${id}-phone-error`}>
                  {t(`cod.errors.${errors.phone}`)}
                </FieldMessage>
              ) : null}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${id}-city`}>{t("cod.city")}</Label>
                <select
                  id={`${id}-city`}
                  name="city_id"
                  required
                  value={cityId}
                  onChange={(event) => setCityId(event.target.value)}
                  aria-invalid={errors.city ? true : undefined}
                  aria-describedby={errors.city ? `${id}-city-error` : undefined}
                  className="rounded-base border-border bg-card text-card-fg focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-danger h-12 w-full border px-3 text-base outline-none focus-visible:ring-4"
                >
                  <option value="">{t("cod.cityPlaceholder")}</option>
                  {cities.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {cityName(candidate)}
                    </option>
                  ))}
                </select>
                {errors.city ? (
                  <FieldMessage id={`${id}-city-error`}>
                    {t(`cod.errors.${errors.city}`)}
                  </FieldMessage>
                ) : null}
              </div>

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
                  <output
                    aria-live="polite"
                    className="text-fg w-8 text-center font-semibold tabular-nums"
                  >
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
            </div>

            <dl className="border-border flex flex-col gap-2 border-t pt-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-fg">{t("cod.subtotal")}</dt>
                <dd className="text-card-fg tabular-nums">{formatPrice(subtotal, format)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-fg">
                  {t("cod.shipping")}
                  {city ? (
                    <span className="block text-xs">
                      {t("cod.deliveryDelay", {
                        min: formatNumber(city.delivery_days_min, format),
                        max: formatNumber(city.delivery_days_max, format),
                      })}
                    </span>
                  ) : null}
                </dt>
                <dd
                  className={cn(
                    "tabular-nums",
                    shipping === 0 ? "text-success font-semibold" : "text-card-fg",
                  )}
                >
                  {shipping === null
                    ? t("cod.chooseCity")
                    : shipping === 0
                      ? t("cod.free")
                      : formatPrice(shipping, format)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 text-base font-bold">
                <dt className="text-card-fg">{t("cod.total")}</dt>
                <dd className="text-card-fg tabular-nums">
                  {formatPrice(subtotal + (shipping ?? 0), format)}
                </dd>
              </div>
            </dl>

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

      {whatsappHref ? (
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden />
            {t("productPage.whatsapp")}
          </a>
        </Button>
      ) : null}
    </div>
  );
}
