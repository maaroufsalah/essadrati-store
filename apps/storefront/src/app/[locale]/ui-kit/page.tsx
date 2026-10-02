import { isLocale } from "@nocido/types";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard, ProductCardSkeleton } from "@/components/commerce/product-card";
import { Price } from "@/components/commerce/price";
import { RatingStars } from "@/components/commerce/rating-stars";
import { Reveal } from "@/components/motion/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listProductCards } from "@/lib/catalog";
import { storeFormat } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";

/**
 * Development-only gallery of the UI kit with real catalog data, to check
 * the theme, RTL and the 390 / 768-1024 / 1280-1440 breakpoints.
 * Every visible string comes from the catalog or the messages.
 */
export default async function UiKitPage({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const [settings, products, t] = await Promise.all([
    getStoreSettings(),
    listProductCards(locale, { limit: 8 }),
    getTranslations("product"),
  ]);
  const format = storeFormat(settings, locale);
  const first = products[0];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6">
      <section className="flex flex-wrap items-center gap-3">
        <Button>{t("from")}</Button>
        <Button variant="accent">{t("featured")}</Button>
        <Button variant="outline">{t("weight")}</Button>
        <Button variant="ghost">{t("weight")}</Button>
        <Badge>{t("featured")}</Badge>
        <Badge variant="danger">{t("sale", { percent: 33 })}</Badge>
        <Badge variant="muted">{t("weight")}</Badge>
        <Input aria-label={t("weight")} placeholder={t("weight")} className="max-w-xs" />
        <Skeleton className="h-12 w-40" />
      </section>
      {first?.price ? (
        <section className="flex flex-wrap items-center gap-6">
          <Price
            amount={first.price.amount}
            original={first.price.original}
            format={format}
            originalLabel={t("originalPrice")}
            size="lg"
          />
          <RatingStars
            rating={4.5}
            label={t("ratingLabel", { rating: 4.5, count: 12 })}
            countText="(12)"
            size="md"
          />
        </section>
      ) : null}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product, index) => (
          <Reveal key={product.id} delay={index * 0.05}>
            <ProductCard product={product} format={format} />
          </Reveal>
        ))}
        <ProductCardSkeleton />
      </section>
    </div>
  );
}

// Never prerendered: in production the route answers 404.
export const dynamic = "force-dynamic";
