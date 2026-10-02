import {
  type CategoryBanner,
  HOME_IMAGE_SIZES,
  homeLinkHref,
  isExternalHref,
  type Locale,
  type LocalizedString,
  resolveLocalized,
} from "@nocido/types";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArtPicture } from "./art-picture";

interface CategoryBannersProps {
  banners: CategoryBanner[];
  locale: Locale;
  fallbacks: Locale[];
  /** Button text when a banner has none. */
  defaultCta: string;
}

function BannerLink({
  href,
  className,
  children,
}: {
  href: string | null;
  className: string;
  children: ReactNode;
}) {
  if (!href) return <div className={className}>{children}</div>;
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/**
 * « Nos univers »: large category banners. Square on phones (one per row),
 * 4:5 from 768px, three or four per row on desktop. Pure server markup:
 * the zoom on hover is CSS (off with reduced motion), no JavaScript.
 */
export function CategoryBanners({ banners, locale, fallbacks, defaultCta }: CategoryBannersProps) {
  const text = (value: LocalizedString) => resolveLocalized(value, locale, fallbacks);
  const four = banners.length % 4 === 0;
  const desktopSizes = four
    ? "(min-width: 1280px) 300px, (min-width: 1024px) 25vw, 50vw"
    : "(min-width: 1280px) 400px, 33vw";

  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-4 sm:gap-5",
        four ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3",
      )}
    >
      {banners.map((banner) => {
        const title = text(banner.title);
        const tagline = text(banner.tagline);
        const href = homeLinkHref(banner.link);
        const cta = text(banner.ctaLabel) || defaultCta;
        return (
          <li key={banner.id}>
            <BannerLink
              href={href}
              className="group rounded-card dark bg-bg relative isolate block aspect-square overflow-hidden md:aspect-[4/5]"
            >
              <ArtPicture
                desktop={banner.imageDesktop}
                mobile={banner.imageMobile}
                alt=""
                desktopSize={HOME_IMAGE_SIZES.bannerDesktop}
                mobileSize={HOME_IMAGE_SIZES.bannerMobile}
                desktopSizes={desktopSizes}
                mobileSizes="100vw"
                className="transition-transform duration-700 ease-out group-hover:scale-105 motion-reduce:transform-none"
              />
              <div
                aria-hidden
                className="from-bg/85 via-bg/25 absolute inset-0 bg-linear-to-t to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-5 text-start sm:p-6">
                {title ? (
                  <h3 className="font-display text-fg text-3xl leading-tight font-bold lg:text-4xl">
                    {title}
                  </h3>
                ) : null}
                {tagline ? <p className="text-fg/85 text-sm sm:text-base">{tagline}</p> : null}
                {href ? (
                  <span className="bg-fg text-bg group-hover:bg-primary group-hover:text-primary-fg mt-2 inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors">
                    {cta}
                    {/* Arrows point to the reading end. */}
                    <ArrowRight className="size-4 rtl:hidden" aria-hidden />
                    <ArrowLeft className="size-4 ltr:hidden" aria-hidden />
                  </span>
                ) : null}
              </div>
            </BannerLink>
          </li>
        );
      })}
    </ul>
  );
}
