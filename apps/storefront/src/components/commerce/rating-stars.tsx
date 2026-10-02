import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface RatingStarsProps {
  rating: number;
  /** Accessible summary, e.g. "Rated 4.9 out of 5, 128 reviews". */
  label: string;
  /** Visible count next to the stars, already formatted. */
  countText?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Five stars filled to the rating (partial fill clipped with a logical
 * inset, so it follows the reading direction).
 */
export function RatingStars({
  rating,
  label,
  countText,
  size = "sm",
  className,
}: RatingStarsProps) {
  const icon = size === "sm" ? "size-4" : "size-5";
  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <span className="inline-flex" aria-hidden>
        {[0, 1, 2, 3, 4].map((index) => {
          const fill = Math.min(1, Math.max(0, rating - index));
          return (
            <span key={index} className={cn("relative inline-block", icon)}>
              <Star className={cn("text-border absolute inset-0", icon)} strokeWidth={1.5} />
              <span
                className="absolute inset-y-0 start-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star className={cn("fill-primary text-primary", icon)} strokeWidth={1.5} />
              </span>
            </span>
          );
        })}
      </span>
      {countText ? (
        <span aria-hidden className="text-muted-fg text-xs tabular-nums">
          {countText}
        </span>
      ) : null}
    </span>
  );
}
