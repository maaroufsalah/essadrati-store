import { isLocale } from "@nocido/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OrderLookupForm } from "@/components/order/order-lookup-form";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "order.lookup" });
  return { title: t("metaTitle"), robots: { index: false, follow: true } };
}

/** Order search by number and phone. */
export default async function OrderLookupPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("order.lookup");
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-10 sm:px-6 lg:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-fg text-3xl font-bold sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-fg">{t("intro")}</p>
      </div>
      <OrderLookupForm locale={locale} />
    </div>
  );
}
