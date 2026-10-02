import {
  type HeroSlide,
  HOME_IMAGE_SIZES,
  homeLinkHref,
  isExternalHref,
  type Locale,
  type LocalizedString,
  resolveLocalized,
  type SliderOptions,
  type TextAlign,
} from "@nocido/types";
import { directionOf } from "@nocido/types/client";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ArtPicture } from "./art-picture";
import { HeroSliderClient, type SliderSlide } from "./hero-slider-client";

const ALIGN: Record<TextAlign, string> = {
  start: "items-start text-start",
  center: "items-center text-center",
  end: "items-end text-end",
};

interface HeroSliderProps {
  slides: HeroSlide[];
  options: SliderOptions;
  locale: Locale;
  fallbacks: Locale[];
  /** Page h1 (store name or SEO title): slides come and go, the h1 stays. */
  heading: string;
}

/**
 * Hero slider under the header: 85vh on desktop, 4:5 on phones. Every
 * slide is rendered here (pictures, text, links) and handed to the client
 * component, which only orchestrates. Only the first picture is a priority
 * download; the others wait for the page to be idle.
 */
export async function HeroSlider({ slides, options, locale, fallbacks, heading }: HeroSliderProps) {
  const t = await getTranslations("home.slider");
  const text = (value: LocalizedString) => resolveLocalized(value, locale, fallbacks);

  const views: SliderSlide[] = slides.map((slide, index) => {
    const title = text(slide.title);
    const subtitle = text(slide.subtitle);
    const href = homeLinkHref(slide.link);
    const ctaLabel = text(slide.ctaLabel) || (href ? t("cta") : "");

    return {
      id: slide.id,
      durationMs: slide.durationSeconds * 1000,
      label: t("slideOf", { index: index + 1, count: slides.length }),
      goToLabel: t("goTo", { index: index + 1 }),
      media: (
        <>
          <ArtPicture
            desktop={slide.imageDesktop}
            mobile={slide.imageMobile}
            alt={title}
            desktopSize={HOME_IMAGE_SIZES.slideDesktop}
            mobileSize={HOME_IMAGE_SIZES.slideMobile}
            desktopSizes="100vw"
            mobileSizes="100vw"
            priority={index === 0}
          />
          <div
            aria-hidden
            className="bg-bg absolute inset-0"
            style={{ opacity: slide.overlay / 100 }}
          />
          {/* Phones: the text sits at the bottom, darken it a little more. */}
          <div
            aria-hidden
            className="from-bg/80 via-bg/10 absolute inset-0 bg-linear-to-t to-transparent md:hidden"
          />
        </>
      ),
      content: (
        <div
          className={cn(
            "mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-16 sm:px-6 md:justify-center md:px-20 md:pb-0 lg:px-24",
            ALIGN[slide.textAlign],
          )}
        >
          <div className={cn("flex max-w-2xl flex-col gap-4 sm:gap-5", ALIGN[slide.textAlign])}>
            {title ? (
              <h2 className="font-display text-fg text-4xl leading-[1.1] font-bold text-balance sm:text-5xl lg:text-6xl xl:text-7xl">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="text-fg/85 max-w-xl text-base text-pretty sm:text-lg">{subtitle}</p>
            ) : null}
            {href && ctaLabel ? (
              <Button asChild size="lg" className="mt-2">
                {isExternalHref(href) ? (
                  <a href={href} target="_blank" rel="noopener noreferrer">
                    {ctaLabel}
                  </a>
                ) : (
                  <Link href={href}>{ctaLabel}</Link>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      ),
    };
  });

  return (
    <>
      <h1 className="sr-only">{heading}</h1>
      <HeroSliderClient
        slides={views}
        transition={options.transition}
        autoplay={options.autoplay}
        direction={directionOf(locale)}
        labels={{
          region: t("label"),
          carousel: t("carousel"),
          slide: t("slide"),
          previous: t("previous"),
          next: t("next"),
          pause: t("pause"),
          play: t("play"),
        }}
      />
    </>
  );
}
