import { isLocale } from "@nocido/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { listCities } from "@/lib/catalog";
import { getStoreSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "checkout" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/** COD checkout of the cart. The cart itself is read client-side (CartProvider). */
export default async function CheckoutPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [settings, cities, t] = await Promise.all([
    getStoreSettings(),
    listCities(),
    getTranslations("checkout"),
  ]);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:py-12">
      <h1 className="text-fg text-3xl font-bold sm:text-4xl">{t("title")}</h1>
      <CheckoutForm locale={locale} cities={cities} codEnabled={settings.commerce.codEnabled} />
    </div>
  );
}
