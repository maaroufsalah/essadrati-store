import { cn } from "@/lib/utils";
import { discountPercent, formatPrice, type StoreFormat } from "@/lib/format";

interface PriceProps {
  amount: number;
  /** Regular price when discounted: shown struck through. */
  original?: number | null;
  format: StoreFormat;
  /** Prefix such as "From", for products with several prices. */
  prefix?: string;
  /** Accessible name of the struck-through regular price. */
  originalLabel: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "text-sm", md: "text-base", lg: "text-2xl" } as const;

/** Store-formatted price (MAD, Latin or Arabic digits from StoreSettings). */
export function Price({
  amount,
  original,
  format,
  prefix,
  originalLabel,
  size = "md",
  className,
}: PriceProps) {
  const discounted = discountPercent(amount, original) !== null;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      {prefix ? <span className="text-muted-fg text-xs">{prefix}</span> : null}
      <data value={amount} className={cn("text-fg font-bold tabular-nums", SIZES[size])}>
        {formatPrice(amount, format)}
      </data>
      {discounted && original ? (
        <del
          className="text-muted-fg text-sm tabular-nums"
          aria-label={`${originalLabel} ${formatPrice(original, format)}`}
        >
          {formatPrice(original, format)}
        </del>
      ) : null}
    </span>
  );
}
