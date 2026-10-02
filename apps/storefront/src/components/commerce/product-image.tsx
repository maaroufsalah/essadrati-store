import { ImageIcon } from "lucide-react";
import Image from "next/image";
import { isSvg } from "@/lib/product-view";
import { cn } from "@/lib/utils";

/** Neutral block shown when a product has no image yet. Decorative only. */
export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("bg-muted text-muted-fg flex items-center justify-center", className)}
    >
      <ImageIcon className="size-1/4 max-h-12 max-w-12 opacity-60" strokeWidth={1.25} />
    </div>
  );
}

interface ProductImageProps {
  src: string | null;
  alt: string;
  /** next/image `sizes`, e.g. "(min-width: 1280px) 25vw, 50vw". */
  sizes: string;
  priority?: boolean;
  className?: string;
}

/** Square product image filling its container, or the placeholder. */
export function ProductImage({ src, alt, sizes, priority, className }: ProductImageProps) {
  if (!src) return <ImagePlaceholder className={cn("aspect-square w-full", className)} />;
  return (
    <div className={cn("bg-muted relative aspect-square w-full overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isSvg(src)}
        className="object-cover transition-transform duration-500 group-hover:scale-105"
      />
    </div>
  );
}
