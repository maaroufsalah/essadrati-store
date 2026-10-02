import { Quote } from "lucide-react";
import { RatingStars } from "@/components/commerce/rating-stars";

export interface TestimonialView {
  key: string;
  author: string;
  text: string;
  rating: number;
  ratingLabel: string;
}

export const TESTIMONIAL_ROW =
  "-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:scroll-px-0 lg:grid-cols-3 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden";
export const TESTIMONIAL_ITEM = "w-[85%] shrink-0 snap-start sm:w-[60%] lg:w-auto";

export function Review({ item, label }: { item: TestimonialView; label: string }) {
  return (
    <figure
      aria-label={label}
      className="rounded-card border-border bg-card text-card-fg shadow-soft flex h-full flex-col gap-4 border p-6"
    >
      <Quote className="text-primary size-8" aria-hidden />
      <blockquote className="flex-1 text-base leading-relaxed">{item.text}</blockquote>
      <figcaption className="flex flex-col gap-2">
        <RatingStars rating={item.rating} label={item.ratingLabel} />
        <span className="text-muted-fg text-sm font-medium">{item.author}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Customer reviews without entrance animation: no motion runtime, for pages
 * that do not load it otherwise (product page).
 */
export function TestimonialList({ items, label }: { items: TestimonialView[]; label: string }) {
  return (
    <div className={TESTIMONIAL_ROW}>
      {items.map((item) => (
        <div key={item.key} className={TESTIMONIAL_ITEM}>
          <Review item={item} label={label} />
        </div>
      ))}
    </div>
  );
}
