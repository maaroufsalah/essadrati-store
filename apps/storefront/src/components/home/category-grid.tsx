import { ProductImage } from "@/components/commerce/product-image";
import { Stagger, StaggerItem } from "@/components/motion/primitives";
import { Link } from "@/i18n/navigation";

export interface CategoryTile {
  handle: string;
  name: string;
  description: string;
  image: string | null;
  linkLabel: string;
}

/** Category tiles: one column on phones, three from 768px. */
export function CategoryGrid({ categories }: { categories: CategoryTile[] }) {
  return (
    <Stagger className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {categories.map((category) => (
        <StaggerItem key={category.handle}>
          <Link
            href={`/c/${category.handle}`}
            aria-label={category.linkLabel}
            className="group rounded-card border-border bg-card relative flex h-full overflow-hidden border sm:flex-col"
          >
            <ProductImage
              src={category.image}
              alt=""
              sizes="(min-width: 768px) 33vw, 40vw"
              className="w-2/5 shrink-0 sm:aspect-[4/3] sm:w-full"
            />
            <div className="flex flex-col justify-center gap-1 p-4 sm:p-5">
              <h3 className="text-card-fg text-lg font-bold sm:text-xl">{category.name}</h3>
              {category.description ? (
                <p className="text-muted-fg line-clamp-2 text-sm">{category.description}</p>
              ) : null}
            </div>
          </Link>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
