import { isLocale, resolveLocalized, toWhatsAppNumber } from "@nocido/types";
import { MapPin, MessageCircle, Phone } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderSummary } from "@/components/order/order-summary";
import { OrderTimeline } from "@/components/order/order-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { listCities } from "@/lib/catalog";
import { formatDate, formatNumber, storeFormat } from "@/lib/format";
import { getOrderTracking } from "@/lib/order-tracking";
import { getStoreSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const [order, t] = await Promise.all([
    getOrderTracking(id),
    getTranslations({ locale, namespace: "order.tracking" }),
  ]);
  return {
    title: order ? t("metaTitle", { number: String(order.display_id) }) : undefined,
    robots: { index: false, follow: false },
  };
}

/** Public tracking of a COD order: status, timeline, items. */
export default async function OrderPage({ params }: PageProps) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [order, settings, cities, t] = await Promise.all([
    getOrderTracking(id),
    getStoreSettings(),
    listCities(),
    getTranslations("order.tracking"),
  ]);
  if (!order) notFound();

  const format = storeFormat(settings, locale);
  const number = formatNumber(order.display_id, format, { useGrouping: false });
  const city = cities.find((candidate) => candidate.id === order.city_id);
  const cityName = city
    ? resolveLocalized(city.name, locale, [settings.localization.defaultLocale])
    : null;
  const whatsapp = settings.contact.whatsapp;
  const cancelled = order.state === "cancelled";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:py-12">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-fg text-3xl font-bold sm:text-4xl">{t("title", { number })}</h1>
          <Badge
            variant={cancelled ? "danger" : order.state === "delivered" ? "success" : "accent"}
          >
            {t(`steps.${order.state}`)}
          </Badge>
        </div>
        <p className="text-muted-fg">
          {t("placedOn", { date: formatDate(order.created_at, format) })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <section className="rounded-card border-border bg-card border p-5 sm:p-6">
            <h2 className="sr-only">{t("progress")}</h2>
            <OrderTimeline order={order} format={format} />
          </section>

          <section className="rounded-card border-border bg-card flex flex-col gap-3 border p-5 text-sm sm:p-6">
            {cityName ? (
              <p className="text-card-fg flex items-center gap-3">
                <MapPin className="text-muted-fg size-4 shrink-0" aria-hidden />
                {t("deliveryTo", { city: cityName })}
              </p>
            ) : null}
            <p className="text-card-fg flex items-center gap-3">
              <Phone className="text-muted-fg size-4 shrink-0" aria-hidden />
              <span className="sr-only">{t("phone")}</span>
              <bdi dir="ltr" className="tabular-nums">
                {order.phone_masked}
              </bdi>
            </p>
          </section>

          {whatsapp ? (
            <section className="rounded-card bg-muted flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <p className="text-fg font-semibold">{t("help")}</p>
              <Button asChild variant="outline">
                <a
                  href={`https://wa.me/${toWhatsAppNumber(whatsapp)}?text=${encodeURIComponent(
                    t("helpMessage", { number }),
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle aria-hidden />
                  {t("helpWhatsapp")}
                </a>
              </Button>
            </section>
          ) : null}
        </div>

        <aside className="rounded-card border-border bg-card h-fit border p-5 sm:p-6 lg:sticky lg:top-24">
          <OrderSummary order={order} format={format} />
        </aside>
      </div>

      <Link href="/order" className="text-fg self-start text-sm underline-offset-4 hover:underline">
        {t("another")}
      </Link>
    </div>
  );
}
