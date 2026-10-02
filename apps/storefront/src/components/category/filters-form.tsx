"use client";

import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { CategoryFilters } from "@/lib/category";
import { cn } from "@/lib/utils";
import { useUrlForm } from "./use-url-form";

export interface FiltersFormProps {
  basePath: string;
  filters: CategoryFilters;
  values: string[];
  bounds: { min: number; max: number } | null;
  currencyLabel: string;
  className?: string;
  /** Called after applying, e.g. to close the mobile sheet. */
  onApplied?: () => void;
}

/** Price range and option values. Checkboxes apply at once; prices on submit. */
export function FiltersForm({
  basePath,
  filters,
  values,
  bounds,
  currencyLabel,
  className,
  onApplied,
}: FiltersFormProps) {
  const t = useTranslations("category");
  const id = useId();
  // Native submissions (no JavaScript) need the locale prefix.
  const locale = useLocale();
  const { pending, onSubmit, onChange } = useUrlForm();

  return (
    <form
      method="get"
      action={`/${locale}${basePath}`}
      onSubmit={(event) => {
        onSubmit(event);
        onApplied?.();
      }}
      onChange={(event) => {
        const field: EventTarget = event.target;
        if (field instanceof HTMLInputElement && field.type === "checkbox") onChange(event);
      }}
      aria-busy={pending}
      className={cn("flex flex-col gap-6", className)}
    >
      {filters.sort !== "featured" ? (
        <input type="hidden" name="sort" value={filters.sort} />
      ) : null}

      {values.length > 0 ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-fg mb-2 text-sm font-semibold">{t("weight")}</legend>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <label
                key={value}
                className="rounded-button border-border has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-fg touch-target inline-flex cursor-pointer items-center border px-4 text-sm font-medium"
              >
                <input
                  type="checkbox"
                  name="w"
                  value={value}
                  defaultChecked={filters.values.includes(value)}
                  className="sr-only"
                />
                <bdi dir="ltr">{value}</bdi>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset className="flex flex-col gap-3">
        <legend className="text-fg mb-2 text-sm font-semibold">{`${t("price")} (${currencyLabel})`}</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-min`} className="text-muted-fg text-xs">
              {t("min")}
            </label>
            <Input
              id={`${id}-min`}
              name="min"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={bounds ? String(bounds.min) : undefined}
              defaultValue={filters.min ?? undefined}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-max`} className="text-muted-fg text-xs">
              {t("max")}
            </label>
            <Input
              id={`${id}-max`}
              name="max"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={bounds ? String(bounds.max) : undefined}
              defaultValue={filters.max ?? undefined}
            />
          </div>
        </div>
      </fieldset>

      <div className="flex items-center gap-3">
        <Button type="submit" size="md" disabled={pending} className="flex-1">
          {t("apply")}
        </Button>
        <Link
          href={filters.sort !== "featured" ? `${basePath}?sort=${filters.sort}` : basePath}
          className="text-accent touch-target inline-flex items-center px-2 text-sm font-semibold hover:underline"
          onClick={onApplied}
        >
          {t("reset")}
        </Link>
      </div>
    </form>
  );
}
