import { Stagger, StaggerItem } from "@/components/motion/primitives";
import {
  Review,
  TESTIMONIAL_ITEM,
  TESTIMONIAL_ROW,
  type TestimonialView,
} from "./testimonial-list";

export type { TestimonialView } from "./testimonial-list";

/** Customer reviews rising into view: swipeable row on phones, three columns from 1024px. */
export function Testimonials({ items, label }: { items: TestimonialView[]; label: string }) {
  return (
    <Stagger className={TESTIMONIAL_ROW}>
      {items.map((item) => (
        <StaggerItem key={item.key} className={TESTIMONIAL_ITEM}>
          <Review item={item} label={label} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
