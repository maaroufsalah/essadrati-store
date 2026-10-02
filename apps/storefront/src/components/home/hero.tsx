import { MessageCircle } from "lucide-react";
import Image from "next/image";
import { ProductImage } from "@/components/commerce/product-image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { ProductCardData } from "@/lib/product-view";
import { isSvg } from "@/lib/product-view";

interface HeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: { label: string; href: string } | null;
  whatsapp: { label: string; href: string } | null;
  image: { url: string; alt: string } | null;
  /** Shown as a composition when no hero image is uploaded. */
  products: ProductCardData[];
}

/**
 * Editorial hero. Text first on mobile, two columns from 1024px. Content is
 * never hidden before hydration (CSS entrance only): it is the LCP.
 */
export function Hero({ eyebrow, title, subtitle, cta, whatsapp, image, products }: HeroProps) {
  const [first, second, third] = products;
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute end-[-10%] -top-40 size-[36rem] rounded-full blur-3xl"
      />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col items-start gap-5 duration-700">
          {eyebrow ? (
            <span className="rounded-base bg-muted text-accent px-3 py-1 text-xs font-semibold tracking-wide uppercase">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="text-fg text-4xl leading-[1.15] font-bold text-balance sm:text-5xl xl:text-6xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-muted-fg max-w-xl text-base sm:text-lg">{subtitle}</p>
          ) : null}
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {cta ? (
              <Button asChild size="lg">
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            ) : null}
            {whatsapp ? (
              <Button asChild size="lg" variant="outline">
                <a href={whatsapp.href} target="_blank" rel="noopener noreferrer">
                  <MessageCircle aria-hidden />
                  {whatsapp.label}
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          {image ? (
            <div className="rounded-card shadow-card relative aspect-[4/5] overflow-hidden">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                unoptimized={isSvg(image.url)}
                className="object-cover"
              />
            </div>
          ) : first ? (
            <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-3 sm:gap-4">
              <div className="rounded-card shadow-card row-span-2 overflow-hidden">
                <ProductImage
                  src={first.thumbnail}
                  alt={first.title}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  priority
                  className="h-full"
                />
              </div>
              {second ? (
                <div className="rounded-card shadow-soft overflow-hidden">
                  <ProductImage
                    src={second.thumbnail}
                    alt={second.title}
                    sizes="25vw"
                    className="h-full"
                  />
                </div>
              ) : null}
              {third ? (
                <div className="rounded-card shadow-soft overflow-hidden">
                  <ProductImage
                    src={third.thumbnail}
                    alt={third.title}
                    sizes="25vw"
                    className="h-full"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
