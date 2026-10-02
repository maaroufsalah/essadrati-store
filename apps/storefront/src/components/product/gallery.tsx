"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ZoomIn, ZoomOut } from "lucide-react";
import { type PointerEvent, useRef, useState } from "react";
import { ImagePlaceholder } from "@/components/commerce/product-image";
import { isSvg } from "@/lib/product-view";
import { cn } from "@/lib/utils";

/**
 * Product gallery: swipeable scroll-snap strip with dots on phones,
 * main image with thumbnails from 1024px. The first image is the LCP
 * (priority, no JavaScript needed to show it).
 */
export function Gallery({ images, title }: { images: string[]; title: string }) {
  const t = useTranslations("productPage");
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);

  // The zoomed photo follows the pointer (or the finger) through CSS variables.
  const follow = (event: PointerEvent<HTMLDivElement>) => {
    const node = frame.current;
    if (!zoomed || !node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--zoom-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    node.style.setProperty("--zoom-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };

  if (images.length === 0) {
    return <ImagePlaceholder className="rounded-card aspect-square w-full" />;
  }

  const goTo = (index: number) => {
    setActive(index);
    setZoomed(false);
    const node = strip.current?.children[index];
    if (node instanceof HTMLElement)
      node.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  return (
    <section aria-label={t("gallery")} className="flex flex-col gap-3 lg:flex-row-reverse lg:gap-4">
      {/* Pointer tracking only moves the zoomed photo; the zoom buttons handle the keyboard. */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        ref={frame}
        className="relative min-w-0 flex-1"
        onPointerMove={follow}
        onPointerDown={follow}
        onKeyDown={(event) => {
          if (event.key === "Escape" && zoomed) setZoomed(false);
        }}
      >
        <div
          ref={strip}
          onScroll={(event) => {
            const node = event.currentTarget;
            const index = Math.round(Math.abs(node.scrollLeft) / node.clientWidth);
            if (index !== active) setActive(index);
          }}
          className={cn(
            "rounded-card flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto lg:overflow-hidden [&::-webkit-scrollbar]:hidden",
            zoomed && "touch-none overflow-hidden",
          )}
        >
          {images.map((src, index) => (
            <div
              key={src}
              className={cn(
                "bg-muted relative aspect-square w-full shrink-0 snap-center overflow-hidden",
                index !== active && "lg:hidden",
              )}
              aria-label={t("image", { index: index + 1, count: images.length })}
              role="group"
            >
              <Image
                src={src}
                alt={index === 0 ? title : ""}
                fill
                priority={index === 0}
                sizes="(min-width: 1024px) 50vw, 100vw"
                unoptimized={isSvg(src)}
                className={cn(
                  "[transform-origin:var(--zoom-x,50%)_var(--zoom-y,50%)] object-cover transition-transform duration-300 ease-out",
                  zoomed && index === active && "scale-[2.2]",
                )}
              />
              {index === active ? (
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onClick={() => setZoomed(!zoomed)}
                  className={cn(
                    "absolute inset-0 focus-visible:outline-none",
                    zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
                  )}
                />
              ) : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setZoomed(!zoomed)}
          aria-pressed={zoomed}
          aria-label={zoomed ? t("zoomOut") : t("zoomIn")}
          className="touch-target bg-card/90 text-card-fg shadow-soft hover:bg-card focus-visible:ring-ring/40 absolute end-3 top-3 inline-flex items-center justify-center rounded-full backdrop-blur transition-colors focus-visible:ring-4 focus-visible:outline-none"
        >
          {zoomed ? (
            <ZoomOut className="size-5" aria-hidden />
          ) : (
            <ZoomIn className="size-5" aria-hidden />
          )}
        </button>
        {images.length > 1 ? (
          <div
            className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden"
            aria-hidden
          >
            {images.map((src, index) => (
              <span
                key={src}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  index === active ? "bg-primary w-5" : "bg-card/80 w-1.5",
                )}
              />
            ))}
          </div>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="hidden gap-3 lg:flex lg:w-20 lg:flex-col">
          {images.map((src, index) => (
            <button
              key={src}
              type="button"
              onClick={() => goTo(index)}
              aria-label={t("showImage", { index: index + 1 })}
              aria-pressed={index === active}
              className={cn(
                "rounded-base bg-muted relative aspect-square overflow-hidden border-2 transition-colors",
                index === active ? "border-primary" : "hover:border-border border-transparent",
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="80px"
                unoptimized={isSvg(src)}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
