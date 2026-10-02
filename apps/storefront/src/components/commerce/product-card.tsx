import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { discountPercent, formatNumber, type StoreFormat } from "@/lib/format";
import type { ProductCardData } from "@/lib/product-view";
import { cn } from "@/lib/utils";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { AddToCartButton, QuickViewButton } from "./card-actions";
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
 * Product tile used by grids and carousels: image with badges and quick
 * view, title, rating, price and add to cart. The title link stretches
 * over the whole card (one tab stop, whole card clickable) while the two
 * buttons sit above it, so no interactive element is nested in a link.
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
  const actionProduct = {
    handle: product.handle,
    title: product.title,
    directVariantId: product.variantCount === 1 ? product.defaultVariantId : null,
    price: product.price?.amount ?? null,
  };

  return (
    <article
      className={cn(
        "group rounded-card border-border/70 bg-card text-card-fg shadow-soft relative flex h-full flex-col overflow-hidden border transition-[box-shadow,translate] duration-300",
        "hover:shadow-card hover:-translate-y-1 motion-reduce:hover:translate-y-0",
        "has-[a:focus-visible]:ring-ring/40 has-[a:focus-visible]:ring-4",
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
        <div className="pointer-events-none absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {percent ? (
            <Badge variant="danger" className="rounded-full px-3 py-1">
              {t("sale", { percent: formatNumber(percent, format) })}
            </Badge>
          ) : null}
          {product.featured ? (
            <Badge variant="primary" className="rounded-full px-3 py-1">
              {t("featured")}
            </Badge>
          ) : null}
        </div>
        <QuickViewButton product={actionProduct} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <h3 className="font-display line-clamp-2 text-base leading-snug font-bold sm:text-lg">
          <Link
            href={`/p/${product.handle}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {product.title}
          </Link>
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
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          {product.price ? (
            <Price
              amount={product.price.amount}
              original={product.price.original}
              format={format}
              prefix={product.priceVaries ? t("from") : undefined}
              originalLabel={t("originalPrice")}
            />
          ) : (
            <span />
          )}
          <AddToCartButton product={actionProduct} />
        </div>
      </div>
    </article>
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
