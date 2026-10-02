import { isLocale } from "@nocido/types";
import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderSummary } from "@/components/order/order-summary";
import { PurchaseTracker } from "@/components/order/purchase-tracker";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { formatNumber, storeFormat } from "@/lib/format";
import { getOrderTracking } from "@/lib/order-tracking";
import { getStoreSettings } from "@/lib/settings";

/** Unicode isolates: the phone stays left to right inside Arabic text. */
const LRI = String.fromCodePoint(0x2066);
const PDI = String.fromCodePoint(0x2069);

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "order.thanks" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** Thank you page after a COD order (product form or checkout). Fires Purchase. */
export default async function ThanksPage({ params }: PageProps) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [order, settings, t] = await Promise.all([
    getOrderTracking(id),
    getStoreSettings(),
    getTranslations("order.thanks"),
  ]);
  if (!order) notFound();

  const format = storeFormat(settings, locale);
  const number = formatNumber(order.display_id, format, { useGrouping: false });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-16">
      <PurchaseTracker
        payload={{
          orderId: order.id,
          currency: order.currency_code.toUpperCase(),
          value: order.total,
          items: order.items.map((item) => ({
            id: item.variant_id ?? item.id,
            name: item.title,
            variant: item.variant_title ?? undefined,
            price: item.unit_price,
            quantity: item.quantity,
          })),
        }}
      />
      <section role="status" className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 className="text-success size-14" aria-hidden />
        <h1 className="text-fg text-3xl font-bold text-balance sm:text-4xl">
          {t("title", { name: order.first_name })}
        </h1>
        <p className="text-muted-fg max-w-prose">
          {t("text", { number, phone: `${LRI}${order.phone_masked}${PDI}` })}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={`/order/${order.id}`}>{t("track")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">{t("continue")}</Link>
          </Button>
        </div>
      </section>
      <section className="rounded-card border-border bg-card border p-5 sm:p-6">
        <OrderSummary order={order} format={format} />
      </section>
    </div>
  );
}
