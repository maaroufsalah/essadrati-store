import { ProductCard } from "@/components/commerce/product-card";
import type { StoreFormat } from "@/lib/format";
import type { ProductCardData } from "@/lib/product-view";

/**
 * Products in a horizontal scroll-snap carousel on phones (no JavaScript,
 * swipeable, follows the reading direction) and a grid from 768px.
 */
export function ProductRail({
  products,
  format,
  label,
}: {
  products: ProductCardData[];
  format: StoreFormat;
  label: string;
}) {
  return (
    <ul
      aria-label={label}
      className="-mx-4 flex snap-x snap-mandatory [scrollbar-width:none] gap-3 overflow-x-auto scroll-smooth px-4 pb-2 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden"
    >
      {products.map((product) => (
        <li key={product.id} className="w-[72%] shrink-0 snap-start sm:w-[45%] md:w-auto">
          <ProductCard product={product} format={format} />
        </li>
      ))}
    </ul>
  );
}
