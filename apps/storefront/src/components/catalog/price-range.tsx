"use client";

import { useTranslations } from "next-intl";
import { type KeyboardEvent, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPrice, type StoreFormat } from "@/lib/format";
import { useCatalogNav } from "./catalog-nav";

const THUMB =
  "pointer-events-none absolute inset-0 h-full w-full appearance-none bg-transparent focus-visible:outline-none " +
  "[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-soft " +
  "[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-card [&::-moz-range-thumb]:bg-primary " +
  "focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-ring/40";

/**
 * Price filter: a two-thumb slider over the catalog price range and two
 * number fields, in the store currency. Applies when a thumb is released or
 * a field is left (Enter), not on every pixel. Native range inputs follow
 * the page direction, so the minimum sits at the reading start in Arabic.
 */
export function PriceRange({
  bounds,
  format,
}: {
  bounds: { min: number; max: number };
  format: StoreFormat;
}) {
  const t = useTranslations("category");
  const id = useId();
  const { query, setPrice } = useCatalogNav();
  const current = (): [number, number] => [
    Math.max(bounds.min, Math.min(query.min ?? bounds.min, bounds.max)),
    Math.min(bounds.max, Math.max(query.max ?? bounds.max, bounds.min)),
  ];
  // Local while dragging; the parent remounts this component when the URL changes.
  const [[low, high], setRange] = useState<[number, number]>(current);

  const commit = (nextLow = low, nextHigh = high) => {
    const min = nextLow <= bounds.min ? null : Math.round(nextLow);
    const max = nextHigh >= bounds.max ? null : Math.round(nextHigh);
    if (min !== query.min || max !== query.max) setPrice(min, max);
  };
  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  };

  const span = Math.max(1, bounds.max - bounds.min);
  const start = ((low - bounds.min) / span) * 100;
  const end = 100 - ((high - bounds.min) / span) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-6">
        <div className="bg-muted absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" />
        <div
          className="bg-primary absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ insetInlineStart: `${start}%`, insetInlineEnd: `${end}%` }}
        />
        <input
          type="range"
          aria-label={t("priceMin")}
          aria-valuetext={formatPrice(low, format)}
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={low}
          onChange={(event) => setRange([Math.min(Number(event.target.value), high), high])}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          className={THUMB}
        />
        <input
          type="range"
          aria-label={t("priceMax")}
          aria-valuetext={formatPrice(high, format)}
          min={bounds.min}
          max={bounds.max}
          step={1}
          value={high}
          onChange={(event) => setRange([low, Math.max(Number(event.target.value), low)])}
          onPointerUp={() => commit()}
          onKeyUp={() => commit()}
          className={THUMB}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-min`} className="text-muted-fg text-xs">
            {`${t("min")} (${format.currency})`}
          </label>
          <Input
            id={`${id}-min`}
            name="min"
            type="number"
            inputMode="numeric"
            min={bounds.min}
            max={bounds.max}
            value={low}
            onChange={(event) => setRange([Number(event.target.value) || bounds.min, high])}
            onBlur={() => commit(Math.min(low, high), high)}
            onKeyDown={onKey}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-max`} className="text-muted-fg text-xs">
            {`${t("max")} (${format.currency})`}
          </label>
          <Input
            id={`${id}-max`}
            name="max"
            type="number"
            inputMode="numeric"
            min={bounds.min}
            max={bounds.max}
            value={high}
            onChange={(event) => setRange([low, Number(event.target.value) || bounds.max])}
            onBlur={() => commit(low, Math.max(low, high))}
            onKeyDown={onKey}
          />
        </div>
      </div>
    </div>
  );
}
