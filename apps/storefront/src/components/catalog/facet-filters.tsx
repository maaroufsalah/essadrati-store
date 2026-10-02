"use client";

import type { FacetKind } from "@nocido/types/client";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { formatNumber, type StoreFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCatalogNav } from "./catalog-nav";
import { PriceRange } from "./price-range";

/** A facet ready to display: title and value labels resolved on the server. */
export interface FacetView {
  id: string;
  kind: FacetKind;
  title: string;
  /** Values are codes or measures (500g): isolate them left to right. */
  ltr: boolean;
  values: { value: string; label: string; count: number }[];
}

export interface FacetFiltersProps {
  facets: FacetView[];
  priceBounds: { min: number; max: number } | null;
  priceTitle: string | null;
  format: StoreFormat;
  /** Page path with the locale, for the no-JavaScript form. */
  action: string;
}

function FacetValues({ facet, format }: { facet: FacetView; format: StoreFormat }) {
  const { query, toggle } = useCatalogNav();
  const selected = query.selected[facet.id] ?? [];
  const groupId = useId();
  return (
    <ul className="flex flex-col gap-1">
      {facet.values.map((item) => {
        const checked = selected.includes(item.value);
        const empty = item.count === 0 && !checked;
        const inputId = `${groupId}-${item.value}`;
        return (
          <li key={item.value}>
            <label
              htmlFor={inputId}
              className={cn(
                "group rounded-base hover:bg-muted flex min-h-11 cursor-pointer items-center gap-3 px-2 text-sm transition-colors",
                empty && "cursor-default opacity-50 hover:bg-transparent",
              )}
            >
              <input
                id={inputId}
                type="checkbox"
                name={facet.id}
                value={item.value}
                checked={checked}
                disabled={empty}
                onChange={() => toggle(facet.id, item.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="border-border peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-fg peer-focus-visible:ring-ring/40 flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors peer-focus-visible:ring-4"
              >
                {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
              <span className="text-fg min-w-0 flex-1 truncate">
                {facet.ltr ? <bdi dir="ltr">{item.label}</bdi> : item.label}
              </span>
              <span className="text-muted-fg text-xs tabular-nums">
                {formatNumber(item.count, format)}
              </span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Every facet of the catalog page: price range first if enabled, then the
 * admin-ordered facets. Changes apply at once (URL replace, no scroll
 * jump); without JavaScript the form submits as a GET.
 */
export function FacetFilters({
  facets,
  priceBounds,
  priceTitle,
  format,
  action,
}: FacetFiltersProps) {
  const t = useTranslations("category");
  const locale = useLocale();
  const { query, pending } = useCatalogNav();

  return (
    <form
      method="get"
      action={action}
      lang={locale}
      aria-busy={pending}
      onSubmit={(event) => event.preventDefault()}
      className="divide-border flex flex-col divide-y"
    >
      {query.sort !== "relevance" ? <input type="hidden" name="sort" value={query.sort} /> : null}
      {priceBounds && priceTitle !== null ? (
        <fieldset className="flex flex-col gap-3 py-5 first:pt-0">
          <legend className="text-fg mb-3 text-sm font-semibold">{priceTitle}</legend>
          <PriceRange
            key={`${query.min ?? ""}-${query.max ?? ""}-${priceBounds.min}-${priceBounds.max}`}
            bounds={priceBounds}
            format={format}
          />
        </fieldset>
      ) : null}
      {facets
        .filter((facet) => facet.values.length > 0)
        .map((facet) => (
          <fieldset key={facet.id} className="flex flex-col gap-2 py-5 first:pt-0">
            <legend className="text-fg mb-2 text-sm font-semibold">{facet.title}</legend>
            <FacetValues facet={facet} format={format} />
          </fieldset>
        ))}
      <noscript>
        <button
          type="submit"
          className="rounded-button bg-primary text-primary-fg mt-4 h-11 w-full font-medium"
        >
          {t("apply")}
        </button>
      </noscript>
    </form>
  );
}
