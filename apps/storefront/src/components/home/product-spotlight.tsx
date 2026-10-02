import { useTranslations } from "next-intl";
import { Price } from "@/components/commerce/price";
import { ProductImage } from "@/components/commerce/product-image";
import { RatingStars } from "@/components/commerce/rating-stars";
import { Reveal } from "@/components/motion/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { discountPercent, formatNumber, type StoreFormat } from "@/lib/format";
import type { ProductCardData } from "@/lib/product-view";

/** One product shown wide (image and details side by side from 768px). */
export function ProductSpotlight({
  product,
  format,
  ctaLabel,
}: {
  product: ProductCardData;
  format: StoreFormat;
  ctaLabel: string;
}) {
  const t = useTranslations("product");
  const percent = product.price
    ? discountPercent(product.price.amount, product.price.original)
    : null;
  return (
    <Reveal>
      <article className="rounded-card border-border bg-card text-card-fg shadow-soft grid overflow-hidden border md:grid-cols-2">
        <ProductImage
          src={product.thumbnail}
          alt={product.title}
          sizes="(min-width: 768px) 50vw, 100vw"
        />
        <div className="flex flex-col justify-center gap-4 p-6 md:p-10">
          {percent ? (
            <Badge variant="danger" className="self-start">
              {t("sale", { percent: formatNumber(percent, format) })}
            </Badge>
          ) : null}
          <h3 className="text-2xl font-bold sm:text-3xl">{product.title}</h3>
          {product.subtitle ? <p className="text-muted-fg">{product.subtitle}</p> : null}
          {product.rating !== null ? (
            <RatingStars
              rating={product.rating}
              size="md"
              label={t("ratingLabel", {
                rating: formatNumber(product.rating, format, { maximumFractionDigits: 1 }),
                count: product.reviewsCount,
              })}
              countText={`(${formatNumber(product.reviewsCount, format)})`}
            />
          ) : null}
          {product.price ? (
            <Price
              amount={product.price.amount}
              original={product.price.original}
              format={format}
              originalLabel={t("originalPrice")}
              size="lg"
            />
          ) : null}
          <Button asChild size="lg" className="self-start">
            <Link href={`/p/${product.handle}`}>{ctaLabel}</Link>
          </Button>
        </div>
      </article>
    </Reveal>
  );
}
