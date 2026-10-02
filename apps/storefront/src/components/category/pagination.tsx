import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type CategoryFilters, toSearchParams } from "@/lib/category";
import { formatNumber, type StoreFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PaginationProps {
  basePath: string;
  filters: CategoryFilters;
  page: number;
  pageCount: number;
  format: StoreFormat;
}

/** Page links keeping the filters in the URL (crawlable, works without JS). */
export async function Pagination({ basePath, filters, page, pageCount, format }: PaginationProps) {
  if (pageCount <= 1) return null;
  const t = await getTranslations("category");
  const href = (target: number) => {
    const query = toSearchParams({ ...filters, page: target }).toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const linkClass =
    "touch-target rounded-base inline-flex items-center justify-center px-3 text-sm font-medium";

  return (
    <nav aria-label={t("pagination")} className="flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className={cn(linkClass, "hover:bg-muted")}
          aria-label={t("previous")}
        >
          {/* Chevrons point backwards in the reading direction. */}
          <ChevronLeft className="size-4 rtl:hidden" aria-hidden />
          <ChevronRight className="size-4 ltr:hidden" aria-hidden />
        </Link>
      ) : null}
      {pages.map((target) =>
        target === page ? (
          <span
            key={target}
            aria-current="page"
            aria-label={t("currentPage", { page: target })}
            className={cn(linkClass, "bg-primary text-primary-fg")}
          >
            {formatNumber(target, format)}
          </span>
        ) : (
          <Link
            key={target}
            href={href(target)}
            aria-label={t("page", { page: target })}
            className={cn(linkClass, "hover:bg-muted text-fg")}
          >
            {formatNumber(target, format)}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className={cn(linkClass, "hover:bg-muted")}
          aria-label={t("next")}
        >
          <ChevronRight className="size-4 rtl:hidden" aria-hidden />
          <ChevronLeft className="size-4 ltr:hidden" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
