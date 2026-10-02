import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { discountPercent, formatNumber, type StoreFormat } from "@/lib/format";
import type { ProductCardData } from "@/lib/product-view";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { RatingStars } from "./rating-stars";

interface ProductCardProps {
  product: ProductCardData;
  format: StoreFormat;
  /** next/image sizes for the grid it sits in. */
  sizes?: string;
  priority?: boolean;
  className?: string;
}

/**
 * Product tile used by grids and carousels: image, badges, title, rating,
 * price. The whole card is one link (no nested interactive elements).
 */
export function ProductCard({
  product,
  format,
  sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw",
  priority,
  className,
}: ProductCardProps) {
  const t = useTranslations("product");
  const percent = product.price
    ? discountPercent(product.price.amount, product.price.original)
    : null;

  return (
    <Link
      href={`/p/${product.handle}`}
      className={cn(
        "group rounded-card border-border bg-card text-card-fg shadow-soft hover:shadow-card flex h-full flex-col overflow-hidden border transition-shadow",
        className,
      )}
    >
      <div className="relative">
        <ProductImage
          src={product.thumbnail}
          alt={product.title}
          sizes={sizes}
          priority={priority}
        />
        <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {percent ? (
            <Badge variant="danger">{t("sale", { percent: formatNumber(percent, format) })}</Badge>
          ) : null}
          {product.featured ? <Badge variant="primary">{t("featured")}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <h3 className="font-display line-clamp-2 text-base leading-snug font-bold sm:text-lg">
          {product.title}
        </h3>
        {product.subtitle ? (
          <p className="text-muted-fg line-clamp-1 text-xs sm:text-sm">{product.subtitle}</p>
        ) : null}
        {product.rating !== null ? (
          <RatingStars
            rating={product.rating}
            label={t("ratingLabel", {
              rating: formatNumber(product.rating, format, { maximumFractionDigits: 1 }),
              count: product.reviewsCount,
            })}
            countText={`(${formatNumber(product.reviewsCount, format)})`}
          />
        ) : null}
        {product.price ? (
          <Price
            className="mt-auto pt-1"
            amount={product.price.amount}
            original={product.price.original}
            format={format}
            prefix={product.priceVaries ? t("from") : undefined}
            originalLabel={t("originalPrice")}
          />
        ) : null}
      </div>
    </Link>
  );
}

/** Same footprint as ProductCard while products load. */
export function ProductCardSkeleton() {
  return (
    <div
      className="rounded-card border-border bg-card flex flex-col overflow-hidden border"
      aria-hidden
    >
      <div className="bg-muted aspect-square w-full animate-pulse" />
      <div className="flex flex-col gap-2 p-4">
        <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
        <div className="bg-muted h-4 w-1/2 animate-pulse rounded" />
        <div className="bg-muted mt-2 h-5 w-1/3 animate-pulse rounded" />
      </div>
    </div>
  );
}
