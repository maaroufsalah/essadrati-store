import { ProductCardSkeleton } from "@/components/commerce/product-card";
import { Skeleton } from "@/components/ui/skeleton";

/** Fallback while the category products stream in: same layout as the results. */
export function ResultsSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]" aria-busy>
      <Skeleton className="rounded-card hidden h-80 lg:block" />
      <div className="flex flex-col gap-5">
        <Skeleton className="h-11 w-full" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
