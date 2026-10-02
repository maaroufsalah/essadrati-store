import type { MediaRef } from "@nocido/types";
import { getImageProps } from "next/image";
import { preload } from "react-dom";
import { isSvg } from "@/lib/product-view";
import { cn } from "@/lib/utils";

interface ArtPictureProps {
  /** Shown from `breakpoint` up. */
  desktop: MediaRef | null;
  /** Shown below `breakpoint`; either image stands in for a missing one. */
  mobile: MediaRef | null;
  alt: string;
  /** Default size when the upload did not record its dimensions. */
  desktopSize: { width: number; height: number };
  mobileSize: { width: number; height: number };
  /** `sizes` per breakpoint, e.g. "100vw" or "(min-width: 1024px) 25vw, 33vw". */
  desktopSizes: string;
  mobileSizes: string;
  /** Media query of the desktop source. */
  breakpoint?: string;
  priority?: boolean;
  className?: string;
}

function imageProps(
  media: MediaRef,
  alt: string,
  fallback: { width: number; height: number },
  sizes: string,
  priority: boolean,
) {
  return getImageProps({
    src: media.url,
    alt,
    width: media.width ?? fallback.width,
    height: media.height ?? fallback.height,
    sizes,
    priority,
    // getImageProps only drops lazy loading for `priority`: ask for it explicitly.
    fetchPriority: priority ? "high" : undefined,
    quality: 75,
    unoptimized: isSvg(media.url),
  }).props;
}

/** <link rel="preload"> in the head, so the LCP image starts with the HTML. */
function preloadImage(props: { src: string; srcSet?: string }, sizes: string, media?: string) {
  preload(props.src, {
    as: "image",
    fetchPriority: "high",
    imageSrcSet: props.srcSet,
    imageSizes: props.srcSet ? sizes : undefined,
    media,
  });
}

/**
 * Art-directed image: a landscape crop for desktop and a portrait one for
 * phones, through <picture>, so the browser downloads only the one it
 * shows. Optimized by next/image (AVIF/WebP, srcset); SVG placeholders are
 * served as is. With `priority`, each source is preloaded for its own media
 * query and fetched first. Covers its positioned parent.
 */
export function ArtPicture({
  desktop,
  mobile,
  alt,
  desktopSize,
  mobileSize,
  desktopSizes,
  mobileSizes,
  breakpoint = "(min-width: 768px)",
  priority = false,
  className,
}: ArtPictureProps) {
  const small = mobile ?? desktop;
  const large = desktop ?? mobile;
  if (!small || !large) return null;

  const { style: _style, ...img } = imageProps(small, alt, mobileSize, mobileSizes, priority);
  const source = imageProps(large, alt, desktopSize, desktopSizes, priority);
  if (priority) {
    if (large === small) preloadImage(img, mobileSizes);
    else {
      preloadImage(img, mobileSizes, `not all and ${breakpoint}`);
      preloadImage(source, desktopSizes, breakpoint);
    }
  }

  return (
    <picture>
      {large !== small ? (
        <source
          media={breakpoint}
          srcSet={source.srcSet ?? source.src}
          sizes={source.srcSet ? desktopSizes : undefined}
          width={source.width}
          height={source.height}
        />
      ) : null}
      <img
        {...img}
        alt={alt}
        className={cn("absolute inset-0 size-full object-cover", className)}
      />
    </picture>
  );
}
