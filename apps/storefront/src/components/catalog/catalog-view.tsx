import {
  type CatalogFacet,
  type CatalogQuery,
  IN_STOCK,
  type Locale,
  ON_SALE,
  parseCatalogQuery,
  resolveLocalized,
  toCatalogSearchParams,
} from "@nocido/types";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/commerce/product-card";
import { JsonLd } from "@/components/seo/json-ld";
import { Link } from "@/i18n/navigation";
import { listCategories, listCollections } from "@/lib/catalog";
import { searchCatalogPage } from "@/lib/catalog-search";
import { itemListJsonLd } from "@/lib/json-ld";
import { siteUrl } from "@/lib/seo";
import { formatNumber, type StoreFormat, storeFormat } from "@/lib/format";
import { getStoreSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import {
  ActiveFilters,
  CatalogSearch,
  FilterDrawer,
  PendingResults,
  ResultsCount,
  SortSelect,
} from "./catalog-controls";
import { CatalogNav } from "./catalog-nav";
import { type FacetView, FacetFilters } from "./facet-filters";

type RawParams = Record<string, string | string[] | undefined>;

/** Enabled facets of a catalog page; a category page has no category facet. */
export async function catalogFacets(scopeCategory?: string): Promise<CatalogFacet[]> {
  const settings = await getStoreSettings();
  return settings.catalog.facets.filter(
    (facet) => facet.enabled && !(scopeCategory && facet.kind === "category"),
  );
}

/** URL state of a catalog page (for metadata and the page itself). */
export async function catalogQuery(raw: RawParams, scopeCategory?: string): Promise<CatalogQuery> {
  return parseCatalogQuery(raw, await catalogFacets(scopeCategory));
}

function Pagination({
  query,
  facets,
  basePath,
  pageCount,
  format,
  labels,
}: {
  query: CatalogQuery;
  facets: CatalogFacet[];
  basePath: string;
  pageCount: number;
  format: StoreFormat;
  labels: {
    nav: string;
    previous: string;
    next: string;
    page: (page: number) => string;
    current: (page: number) => string;
  };
}) {
  if (pageCount <= 1) return null;
  const href = (page: number) => {
    const search = toCatalogSearchParams({ ...query, page }, facets).toString();
    return search ? `${basePath}?${search}` : basePath;
  };
  const linkClass =
    "touch-target rounded-base inline-flex items-center justify-center px-3 text-sm font-medium";
  return (
    <nav aria-label={labels.nav} className="flex items-center justify-center gap-1">
      {query.page > 1 ? (
        <Link
          href={href(query.page - 1)}
          rel="prev"
          className={cn(linkClass, "hover:bg-muted")}
          aria-label={labels.previous}
        >
          <ChevronLeft className="size-4 rtl:hidden" aria-hidden />
          <ChevronRight className="size-4 ltr:hidden" aria-hidden />
        </Link>
      ) : null}
      {Array.from({ length: pageCount }, (_, index) => index + 1).map((page) =>
        page === query.page ? (
          <span
            key={page}
            aria-current="page"
            aria-label={labels.current(page)}
            className={cn(linkClass, "bg-primary text-primary-fg")}
          >
            {formatNumber(page, format)}
          </span>
        ) : (
          <Link
            key={page}
            href={href(page)}
            aria-label={labels.page(page)}
            className={cn(linkClass, "hover:bg-muted")}
          >
            {formatNumber(page, format)}
          </Link>
        ),
      )}
      {query.page < pageCount ? (
        <Link
          href={href(query.page + 1)}
          rel="next"
          className={cn(linkClass, "hover:bg-muted")}
          aria-label={labels.next}
        >
          <ChevronRight className="size-4 rtl:hidden" aria-hidden />
          <ChevronLeft className="size-4 ltr:hidden" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}

/**
 * Catalog listing shared by /c/[handle] and /products: admin-configured
 * facets with live counts, price range, sort, active filter chips and
 * pagination, all in the URL. The backend search returns one page of
 * product ids; only those products are loaded.
 */
export async function CatalogView({
  locale,
  basePath,
  raw,
  scopeCategory,
}: {
  locale: Locale;
  /** Page path without the locale, e.g. /c/asal-hor. */
  basePath: string;
  raw: RawParams;
  scopeCategory?: string;
}) {
  const [settings, facets, categories, collections, t] = await Promise.all([
    getStoreSettings(),
    catalogFacets(scopeCategory),
    listCategories(locale),
    listCollections(locale),
    getTranslations("category"),
  ]);
  const format = storeFormat(settings, locale);
  const fallbacks = [settings.localization.defaultLocale];
  const query = parseCatalogQuery(raw, facets);
  const { products, result } = await searchCatalogPage(locale, {
    params: toCatalogSearchParams(query, facets),
    scopeCategory,
  });
  // A page number past the end is not a page of the series.
  if (query.page > result.pageCount) notFound();
  const effective = { ...query, page: result.page };

  const defaultTitle: Record<CatalogFacet["kind"], string> = {
    price: t("facetPrice"),
    category: t("facetCategory"),
    collection: t("facetCollection"),
    availability: t("facetAvailability"),
    promo: t("facetPromo"),
    option: "",
  };
  const titleOf = (facet: CatalogFacet) =>
    resolveLocalized(facet.label, locale, fallbacks) ||
    defaultTitle[facet.kind] ||
    (facet.option ?? facet.id);
  const valueLabel = (facet: CatalogFacet, value: string): string => {
    switch (facet.kind) {
      case "category":
        return categories.find((category) => category.handle === value)?.name ?? value;
      case "collection":
        return collections.find((collection) => collection.handle === value)?.title ?? value;
      case "availability":
        return value === IN_STOCK ? t("inStock") : value;
      case "promo":
        return value === ON_SALE ? t("onSale") : value;
      case "option":
      case "price":
        return value;
    }
  };
  const rank = (handle: string) => {
    const index = categories.findIndex((category) => category.handle === handle);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };

  const views: FacetView[] = facets.flatMap((facet) => {
    const found = result.facets.find((item) => item.id === facet.id);
    if (!found) return [];
    const values = found.values.map((item) => ({ ...item, label: valueLabel(facet, item.value) }));
    if (facet.kind === "category") values.sort((a, b) => rank(a.value) - rank(b.value));
    return [
      {
        id: facet.id,
        kind: facet.kind,
        title: titleOf(facet),
        // Option values are codes or measures (500g): isolated left to right.
        ltr: facet.kind === "option",
        values,
      },
    ];
  });
  const labels = Object.fromEntries(
    views.map((view) => [
      view.id,
      Object.fromEntries(view.values.map((item) => [item.value, item.label])),
    ]),
  );
  const priceFacet = facets.find((facet) => facet.kind === "price");
  const filterProps = {
    facets: views,
    priceBounds: priceFacet ? result.priceRange : null,
    priceTitle: priceFacet ? titleOf(priceFacet) : null,
    format,
    action: `/${locale}${basePath}`,
  };

  const pageHref = (page: number) => {
    const search = toCatalogSearchParams({ ...effective, page }, facets).toString();
    return siteUrl(`/${locale}${basePath}${search ? `?${search}` : ""}`);
  };

  return (
    <CatalogNav query={effective} facetIds={facets.map((facet) => facet.id)}>
      {/* Paginated series (React hoists these links into the head). */}
      {result.page > 1 ? <link rel="prev" href={pageHref(result.page - 1)} /> : null}
      {result.page < result.pageCount ? <link rel="next" href={pageHref(result.page + 1)} /> : null}
      {products.length > 0 ? (
        <JsonLd
          data={itemListJsonLd(
            products.map((product) => ({
              name: product.title,
              url: siteUrl(`/${locale}/p/${product.handle}`),
            })),
            (result.page - 1) * 12 + 1,
          )}
        />
      ) : null}
      <div className="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside aria-label={t("filters")} className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pe-2">
            <h2 className="text-fg mb-4 text-lg font-bold">{t("filters")}</h2>
            <FacetFilters {...filterProps} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ResultsCount total={result.total} format={format} />
            <div className="flex flex-wrap items-center gap-2">
              <CatalogSearch />
              <FilterDrawer {...filterProps} total={result.total} />
              <SortSelect />
            </div>
          </div>
          <ActiveFilters labels={labels} format={format} />

          {/* Product cards are h3: the list gets its own h2 under the page h1. */}
          <h2 className="sr-only">{t("listTitle")}</h2>
          <PendingResults count={products.length}>
            {products.length === 0 ? (
              <p className="rounded-card border-border text-muted-fg border border-dashed p-10 text-center">
                {t("empty")}
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                {products.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard
                      product={product}
                      format={format}
                      priority={index < 2}
                      sizes="(min-width: 1280px) 300px, (min-width: 768px) 30vw, 50vw"
                    />
                  </li>
                ))}
              </ul>
            )}
          </PendingResults>

          <Pagination
            query={effective}
            facets={facets}
            basePath={basePath}
            pageCount={result.pageCount}
            format={format}
            labels={{
              nav: t("pagination"),
              previous: t("previous"),
              next: t("next"),
              page: (page) => t("page", { page: formatNumber(page, format) }),
              current: (page) => t("currentPage", { page: formatNumber(page, format) }),
            }}
          />
        </div>
      </div>
    </CatalogNav>
  );
}
