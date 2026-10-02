"use client";

import type { CodCity } from "@nocido/types";
import { useTranslations } from "next-intl";
import { estimateShipping } from "@/lib/cod-form";
import { formatNumber, formatPrice, type StoreFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Subtotal, delivery estimate for the chosen city and total to pay on delivery. */
export function CodSummary({
  subtotal,
  city,
  freeShippingThreshold,
  format,
}: {
  subtotal: number;
  city: CodCity | null;
  freeShippingThreshold: number | null;
  format: StoreFormat;
}) {
  const t = useTranslations("cod");
  const shipping = estimateShipping(city?.fee ?? null, subtotal, freeShippingThreshold);
  return (
    <dl className="border-border flex flex-col gap-2 border-t pt-4 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-fg">{t("subtotal")}</dt>
        <dd className="text-card-fg tabular-nums">{formatPrice(subtotal, format)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-fg">
          {t("shipping")}
          {city ? (
            <span className="block text-xs">
              {t("deliveryDelay", {
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
            ? t("chooseCity")
            : shipping === 0
              ? t("free")
              : formatPrice(shipping, format)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 text-base font-bold">
        <dt className="text-card-fg">{t("total")}</dt>
        <dd className="text-card-fg tabular-nums">
          {formatPrice(subtotal + (shipping ?? 0), format)}
        </dd>
      </div>
    </dl>
  );
}
