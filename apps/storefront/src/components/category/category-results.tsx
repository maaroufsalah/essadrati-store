import type { Locale } from "@nocido/types";
import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/commerce/product-card";
import { listCategoryProducts } from "@/lib/catalog";
import {
  applyFilters,
  availableValues,
  type CategoryFilters,
  paginate,
  priceBounds,
  toCatalogItem,
} from "@/lib/category";
import { formatNumber, type StoreFormat } from "@/lib/format";
import { FilterSheet } from "./filter-sheet";
import { FiltersForm } from "./filters-form";
import { Pagination } from "./pagination";
import { SortSelect } from "./sort-select";

interface CategoryResultsProps {
  locale: Locale;
  categoryId: string;
  basePath: string;
  filters: CategoryFilters;
  format: StoreFormat;
}

/** Filters sidebar, toolbar, product grid and pagination (streamed). */
export async function CategoryResults({
  locale,
  categoryId,
  basePath,
  filters,
  format,
}: CategoryResultsProps) {
  const [products, t] = await Promise.all([
    listCategoryProducts(locale, categoryId),
    getTranslations("category"),
  ]);
  const items = products.map(toCatalogItem);
  const results = applyFilters(items, filters);
  const { items: pageItems, page, pageCount } = paginate(results, filters.page);
  const activeCount =
    filters.values.length + (filters.min !== null || filters.max !== null ? 1 : 0);
  const formProps = {
    basePath,
    filters,
    values: availableValues(items),
    bounds: priceBounds(items),
    currencyLabel: format.currency,
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside aria-label={t("filters")} className="hidden lg:block">
        <div className="rounded-card border-border bg-card sticky top-24 border p-5">
          <h2 className="text-card-fg mb-4 text-lg font-bold">{t("filters")}</h2>
          <FiltersForm {...formProps} />
        </div>
      </aside>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-fg text-sm" aria-live="polite">
            {t("results", {
              count: results.length,
              countText: formatNumber(results.length, format),
            })}
          </p>
          <div className="flex items-center gap-2">
            <FilterSheet {...formProps} activeCount={activeCount} />
            <SortSelect basePath={basePath} filters={filters} />
          </div>
        </div>

        {pageItems.length === 0 ? (
          <p className="rounded-card border-border text-muted-fg border border-dashed p-10 text-center">
            {t("empty")}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
            {pageItems.map((item, index) => (
              <li key={item.card.id}>
                <ProductCard
                  product={item.card}
                  format={format}
                  priority={index < 4}
                  sizes="(min-width: 1536px) 20vw, (min-width: 768px) 30vw, 50vw"
                />
              </li>
            ))}
          </ul>
        )}

        <Pagination
          basePath={basePath}
          filters={filters}
          page={page}
          pageCount={pageCount}
          format={format}
        />
      </div>
    </div>
  );
}
