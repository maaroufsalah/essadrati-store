"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatNumber, formatPrice, type StoreFormat } from "@/lib/format";

/** Inline confirmation after a COD order. */
export function CodSuccess({
  order,
  format,
}: {
  order: { displayId: number; total: number; phone: string };
  format: StoreFormat;
}) {
  const t = useTranslations("cod");
  return (
    <div
      role="status"
      className="rounded-card border-success bg-card flex flex-col items-start gap-4 border-2 p-6"
    >
      <CheckCircle2 className="text-success size-10" aria-hidden />
      <h2 className="text-card-fg text-2xl font-bold">{t("successTitle")}</h2>
      <p className="text-muted-fg">
        {t("successText", {
          number: formatNumber(order.displayId, format, { useGrouping: false }),
          phone: order.phone,
        })}
      </p>
      <p className="text-card-fg text-lg font-bold">{formatPrice(order.total, format)}</p>
      <Button asChild variant="outline">
        <Link href="/">{t("successContinue")}</Link>
      </Button>
    </div>
  );
}
