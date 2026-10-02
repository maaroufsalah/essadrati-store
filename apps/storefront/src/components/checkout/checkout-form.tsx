"use client";

import type { CodCity, Locale } from "@nocido/types";
import { ShieldCheck, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { type CodFieldValues, CodFields } from "@/components/cod/cod-fields";
import { CodSummary } from "@/components/cod/cod-summary";
import { ProductImage } from "@/components/commerce/product-image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics";
import { placeCheckoutOrder } from "@/lib/cod-action";
import { IDLE } from "@/lib/cod-form";
import { formatNumber, formatPrice } from "@/lib/format";

interface CheckoutFormProps {
  locale: Locale;
  cities: CodCity[];
  codEnabled: boolean;
}

/** Multi-product COD checkout: cart summary, customer fields, totals by city. */
export function CheckoutForm({ locale, cities, codEnabled }: CheckoutFormProps) {
  const t = useTranslations();
  const { cart, loaded, format, freeShippingThreshold, setOpen } = useCart();
  const [state, action, pending] = useActionState(placeCheckoutOrder, IDLE);
  const [, startTransition] = useTransition();
  const [fields, setFields] = useState<CodFieldValues>({ name: "", phone: "", cityId: "" });
  const idempotencyKey = useRef<string | null>(null);
  const started = useRef(false);
  const city = cities.find((candidate) => candidate.id === fields.cityId) ?? null;
  const errors = state.status === "error" ? state.fieldErrors : {};

  useEffect(() => {
    if (started.current || !loaded || cart.lines.length === 0) return;
    started.current = true;
    track("InitiateCheckout", {
      currency: format.currency,
      value: cart.subtotal,
      items: cart.lines.map((line) => ({
        id: line.variantId,
        name: line.title,
        variant: line.variantTitle,
        price: line.unitPrice,
        quantity: line.quantity,
      })),
    });
  }, [cart, format.currency, loaded]);

  if (loaded && cart.lines.length === 0) {
    return (
      <div className="rounded-card border-border flex flex-col items-center gap-4 border border-dashed p-10 text-center">
        <ShoppingBag className="text-muted-fg size-12" aria-hidden />
        <p className="text-muted-fg">{t("checkout.empty")}</p>
        <Button asChild>
          <Link href="/">{t("checkout.backToShop")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
      <form
        action={action}
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          idempotencyKey.current ??= crypto.randomUUID();
          data.set("idempotency_key", idempotencyKey.current);
          startTransition(() => action(data));
        }}
        className="rounded-card border-border bg-card order-2 flex flex-col gap-4 border p-5 lg:order-1"
        noValidate
      >
        <input type="hidden" name="locale" value={locale} />
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />
        <h2 className="text-card-fg text-lg font-bold">{t("cod.title")}</h2>
        <CodFields
          locale={locale}
          cities={cities}
          values={fields}
          onChange={setFields}
          errors={errors}
        />
        <CodSummary
          subtotal={cart.subtotal}
          city={city}
          freeShippingThreshold={freeShippingThreshold}
          format={format}
        />
        {state.status === "error" && state.formError ? (
          <p role="alert" className="rounded-base bg-danger/10 text-danger p-3 text-sm">
            {t(`cod.errors.${state.formError}`)}
          </p>
        ) : null}
        {/* Sticky on phones so the order button stays reachable. */}
        <div className="bg-card pb-safe sticky bottom-0 -mx-5 flex flex-col gap-2 px-5 pt-2 pb-3 lg:static lg:mx-0 lg:p-0">
          <Button
            type="submit"
            size="lg"
            disabled={pending || !codEnabled || !loaded}
            className="w-full"
          >
            {pending ? t("cod.submitting") : t("cod.submit")}
          </Button>
          <p className="text-muted-fg flex items-center justify-center gap-2 text-xs">
            <ShieldCheck className="size-4" aria-hidden />
            {t("cod.secure")}
          </p>
        </div>
      </form>

      <aside aria-label={t("checkout.summary")} className="order-1 flex flex-col gap-4 lg:order-2">
        <div className="flex items-center justify-between">
          <h2 className="text-fg text-lg font-bold">{t("checkout.summary")}</h2>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-accent text-sm font-semibold hover:underline"
          >
            {t("checkout.edit")}
          </button>
        </div>
        <p className="text-muted-fg text-sm">
          {t("checkout.items", { count: cart.count, countText: formatNumber(cart.count, format) })}
        </p>
        <ul className="flex flex-col gap-3">
          {cart.lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3">
              <div className="rounded-base relative w-16 shrink-0 overflow-hidden">
                <ProductImage src={line.thumbnail} alt="" sizes="64px" />
                <span className="bg-fg text-bg absolute end-1 top-1 rounded-full px-1.5 text-[11px] font-bold tabular-nums">
                  {formatNumber(line.quantity, format)}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-fg line-clamp-1 text-sm font-semibold">{line.title}</span>
                <span className="text-muted-fg text-xs">
                  <bdi dir="ltr">{line.variantTitle}</bdi>
                </span>
              </div>
              <span className="text-fg text-sm font-semibold tabular-nums">
                {formatPrice(line.total, format)}
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
