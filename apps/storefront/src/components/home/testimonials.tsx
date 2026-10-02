import { Quote } from "lucide-react";
import { RatingStars } from "@/components/commerce/rating-stars";
import { Stagger, StaggerItem } from "@/components/motion/primitives";

export interface TestimonialView {
  key: string;
  author: string;
  text: string;
  rating: number;
  ratingLabel: string;
}

/** Customer reviews: swipeable row on phones, three columns from 1024px. */
export function Testimonials({ items, label }: { items: TestimonialView[]; label: string }) {
  return (
    <Stagger className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:scroll-px-0 lg:grid-cols-3 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => (
        <StaggerItem key={item.key} className="w-[85%] shrink-0 snap-start sm:w-[60%] lg:w-auto">
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
        </StaggerItem>
      ))}
    </Stagger>
  );
}
