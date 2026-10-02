"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { type CategoryFilters, SORTS, type Sort } from "@/lib/category";
import { useUrlForm } from "./use-url-form";

const LABELS: Record<Sort, "sortFeatured" | "sortPriceAsc" | "sortPriceDesc" | "sortNewest"> = {
  featured: "sortFeatured",
  price_asc: "sortPriceAsc",
  price_desc: "sortPriceDesc",
  newest: "sortNewest",
};

/** Native select (accessible, keyboard friendly) that keeps the active filters. */
export function SortSelect({ basePath, filters }: { basePath: string; filters: CategoryFilters }) {
  const t = useTranslations("category");
  const id = useId();
  // Native submissions (no JavaScript) need the locale prefix.
  const locale = useLocale();
  const { onSubmit, onChange } = useUrlForm();

  return (
    <form
      method="get"
      action={`/${locale}${basePath}`}
      onSubmit={onSubmit}
      onChange={onChange}
      className="flex items-center gap-2"
    >
      {filters.min !== null ? <input type="hidden" name="min" value={filters.min} /> : null}
      {filters.max !== null ? <input type="hidden" name="max" value={filters.max} /> : null}
      {filters.values.map((value) => (
        <input key={value} type="hidden" name="w" value={value} />
      ))}
      <label htmlFor={id} className="text-muted-fg hidden text-sm sm:inline">
        {t("sort")}
      </label>
      <select
        id={id}
        name="sort"
        defaultValue={filters.sort}
        className="rounded-base border-border bg-card text-card-fg focus-visible:ring-ring/30 h-11 border px-3 text-sm outline-none focus-visible:ring-4"
      >
        {SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {t(LABELS[sort])}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="text-accent text-sm underline">
          {t("apply")}
        </button>
      </noscript>
    </form>
  );
}
