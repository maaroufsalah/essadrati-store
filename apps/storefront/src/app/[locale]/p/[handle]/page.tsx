import { isLocale, type Locale, resolveLocalized, toWhatsAppNumber } from "@nocido/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/commerce/product-card";
import { RatingStars } from "@/components/commerce/rating-stars";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { Gallery } from "@/components/product/gallery";
import { PurchaseForm } from "@/components/product/purchase-form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getProductByHandle, listCities, listProductCards } from "@/lib/catalog";
import { publicEnv } from "@/lib/env";
import { formatNumber, formatPrice, storeFormat } from "@/lib/format";
import { productJsonLd, toProductDetail } from "@/lib/product-detail";
import { alternatesFor } from "@/lib/seo";
import { getStoreSettings } from "@/lib/settings";

interface PageProps {
  params: Promise<{ locale: string; handle: string }>;
}

/** Product pages are cached for an hour and revalidated with the catalog tag. */
export const revalidate = 3600;

async function loadProduct(locale: Locale, handle: string) {
  const product = await getProductByHandle(locale, handle);
  return product ? toProductDetail(product) : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, handle } = await params;
  if (!isLocale(locale)) return {};
  const [detail, t] = await Promise.all([
    loadProduct(locale, handle),
    getTranslations({ locale, namespace: "productPage" }),
  ]);
  if (!detail) return {};
  const description = t("metaDescription", {
    product: detail.title,
    subtitle: detail.subtitle || detail.title,
  });
  return {
    title: detail.title,
    description,
    alternates: await alternatesFor(locale, `/p/${handle}`),
    openGraph: {
      type: "website",
      title: detail.title,
      description,
      images: detail.images[0] ? [{ url: detail.images[0] }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { locale, handle } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const detail = await loadProduct(locale, handle);
  if (!detail) notFound();

  const [settings, cities, related, t, tCommon, tProduct] = await Promise.all([
    getStoreSettings(),
    listCities(),
    detail.categoryIds.length
      ? listProductCards(locale, { categoryId: detail.categoryIds, limit: 5 })
      : Promise.resolve([]),
    getTranslations("productPage"),
    getTranslations("common"),
    getTranslations("product"),
  ]);
  const format = storeFormat(settings, locale);
  const fallbacks = [settings.localization.defaultLocale];
  const storeName = resolveLocalized(settings.identity.storeName, locale, fallbacks);
  const whatsappNumber =
    settings.commerce.whatsappOrderEnabled && settings.contact.whatsapp
      ? toWhatsAppNumber(settings.contact.whatsapp)
      : null;
  const threshold = settings.commerce.freeShippingThreshold;
  const jsonLd = productJsonLd(detail, {
    url: `${publicEnv.NEXT_PUBLIC_SITE_URL}/${locale}/p/${handle}`,
    currency: settings.localization.defaultCurrency,
    brand: storeName,
  });
  const relatedProducts = related.filter((product) => product.id !== detail.id).slice(0, 4);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-6 sm:px-6 lg:py-10">
      <script
        type="application/ld+json"
        // JSON.stringify output; "<" is escaped so the data cannot close the script tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Breadcrumb
        label={t("breadcrumb")}
        items={[{ label: tCommon("home"), href: "/" }, { label: detail.title }]}
      />

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <Gallery images={detail.images} title={detail.title} />

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-fg text-3xl leading-tight font-bold sm:text-4xl">{detail.title}</h1>
            {detail.subtitle ? <p className="text-muted-fg text-lg">{detail.subtitle}</p> : null}
            {detail.rating !== null ? (
              <RatingStars
                rating={detail.rating}
                size="md"
                label={tProduct("ratingLabel", {
                  rating: formatNumber(detail.rating, format, { maximumFractionDigits: 1 }),
                  count: detail.reviewsCount,
                })}
                countText={`(${formatNumber(detail.reviewsCount, format)})`}
              />
            ) : null}
          </header>

          <PurchaseForm
            locale={locale}
            title={detail.title}
            variants={detail.variants}
            cities={cities}
            format={format}
            freeShippingThreshold={threshold}
            codEnabled={settings.commerce.codEnabled}
            whatsappNumber={whatsappNumber}
          />

          <Accordion type="multiple" defaultValue={["description"]}>
            {detail.description ? (
              <AccordionItem value="description">
                <AccordionTrigger>{t("description")}</AccordionTrigger>
                <AccordionContent className="text-fg leading-relaxed whitespace-pre-line">
                  {detail.description}
                </AccordionContent>
              </AccordionItem>
            ) : null}
            <AccordionItem value="delivery">
              <AccordionTrigger>{t("delivery")}</AccordionTrigger>
              <AccordionContent>
                <p>{t("deliveryText")}</p>
                {threshold !== null ? (
                  <p className="mt-2">
                    {t("deliveryFree", { amount: formatPrice(threshold, format) })}
                  </p>
                ) : null}
              </AccordionContent>
            </AccordionItem>
            {settings.commerce.returnDays > 0 ? (
              <AccordionItem value="returns">
                <AccordionTrigger>{t("returns")}</AccordionTrigger>
                <AccordionContent>
                  {t("returnsText", { days: formatNumber(settings.commerce.returnDays, format) })}
                </AccordionContent>
              </AccordionItem>
            ) : null}
          </Accordion>
        </div>
      </div>

      {relatedProducts.length > 0 ? (
        <section className="flex flex-col gap-5">
          <h2 className="text-fg text-2xl font-bold sm:text-3xl">{t("related")}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {relatedProducts.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} format={format} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
