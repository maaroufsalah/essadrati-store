"use client";

import { CATALOG_SORTS, type CatalogSort, activeFilterCount } from "@nocido/types/client";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import { ProductCardSkeleton } from "@/components/commerce/product-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatNumber, formatPrice, type StoreFormat } from "@/lib/format";
import { useCatalogNav } from "./catalog-nav";
import { FacetFilters, type FacetFiltersProps } from "./facet-filters";

const SORT_LABELS: Record<
  CatalogSort,
  "sortRelevance" | "sortPriceAsc" | "sortPriceDesc" | "sortNewest" | "sortBestsellers"
> = {
  relevance: "sortRelevance",
  price_asc: "sortPriceAsc",
  price_desc: "sortPriceDesc",
  newest: "sortNewest",
  bestsellers: "sortBestsellers",
};

/** Native select (keyboard and screen-reader friendly), applied at once. */
export function SortSelect() {
  const t = useTranslations("category");
  const id = useId();
  const { query, navigate } = useCatalogNav();
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-muted-fg hidden text-sm sm:inline">
        {t("sort")}
      </label>
      <select
        id={id}
        name="sort"
        value={query.sort}
        onChange={(event) =>
          navigate({ ...query, sort: event.target.value as CatalogSort, page: 1 })
        }
        className="rounded-base border-border bg-card text-card-fg focus-visible:ring-ring/30 h-11 border px-3 text-sm outline-none focus-visible:ring-4"
      >
        {CATALOG_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(SORT_LABELS[sort])}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Removable chips of the active filters, and "clear all". */
export function ActiveFilters({
  labels,
  format,
}: {
  /** Facet id -> value -> label, from the server. */
  labels: Record<string, Record<string, string>>;
  format: StoreFormat;
}) {
  const t = useTranslations("category");
  const { query, toggle, setPrice, clear } = useCatalogNav();
  const chips: { key: string; label: string; remove: () => void }[] = [];
  for (const [facetId, values] of Object.entries(query.selected)) {
    for (const value of values) {
      chips.push({
        key: `${facetId}:${value}`,
        label: labels[facetId]?.[value] ?? value,
        remove: () => toggle(facetId, value),
      });
    }
  }
  if (query.min !== null || query.max !== null) {
    const min = query.min !== null ? formatPrice(query.min, format) : null;
    const max = query.max !== null ? formatPrice(query.max, format) : null;
    chips.push({
      key: "price",
      label:
        min && max
          ? t("priceRange", { min, max })
          : min
            ? `${t("min")} ${min}`
            : `${t("max")} ${max ?? ""}`,
      remove: () => setPrice(null, null),
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t("activeFilters")} role="group">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.remove}
          aria-label={t("removeFilter", { label: chip.label })}
          className="border-border bg-card text-fg hover:border-primary focus-visible:ring-ring/40 inline-flex h-9 items-center gap-1.5 rounded-full border ps-3 pe-2 text-sm transition-colors focus-visible:ring-4 focus-visible:outline-none"
        >
          <bdi>{chip.label}</bdi>
          <X className="size-4" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        onClick={clear}
        className="text-accent touch-target px-2 text-sm font-semibold hover:underline"
      >
        {t("clearAll")}
      </button>
    </div>
  );
}

/**
 * Phones and tablets: full-screen filter sheet opened by « Filtrer (n) »,
 * filters apply live behind it and the footer shows the live result count.
 */
export function FilterDrawer({ total, ...props }: FacetFiltersProps & { total: number }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { query, clear, pending } = useCatalogNav();
  const count = activeFilterCount(query);
  const countText = formatNumber(count, props.format);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="md" className="lg:hidden">
          <SlidersHorizontal aria-hidden />
          {t("category.filterButton", { count, countText })}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        closeLabel={t("common.close")}
        aria-describedby={undefined}
        className="h-dvh max-h-dvh gap-0 rounded-none"
      >
        <SheetHeader className="border-border border-b">
          <SheetTitle>{t("category.filters")}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <FacetFilters {...props} />
        </div>
        <div className="border-border bg-card pb-safe flex items-center gap-3 border-t p-4">
          <Button variant="outline" size="lg" onClick={clear} disabled={count === 0}>
            {t("category.clearAll")}
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={() => setOpen(false)}
            aria-live="polite"
            disabled={pending}
          >
            {t("category.showResults", {
              count: total,
              countText: formatNumber(total, props.format),
            })}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Results count of the toolbar, announced politely. */
export function ResultsCount({ total, format }: { total: number; format: StoreFormat }) {
  const t = useTranslations("category");
  const { pending } = useCatalogNav();
  return (
    <p className="text-muted-fg text-sm" aria-live="polite">
      {pending
        ? t("loading")
        : t("results", { count: total, countText: formatNumber(total, format) })}
    </p>
  );
}

/** The product grid, replaced by skeletons while the next results load. */
export function PendingResults({ children, count }: { children: ReactNode; count: number }) {
  const { pending } = useCatalogNav();
  if (!pending) return <>{children}</>;
  return (
    <div aria-busy className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
      {Array.from({ length: Math.max(3, Math.min(count, 12)) }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}
