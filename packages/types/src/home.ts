import { z } from "zod";
import {
  HOME_SECTION_IDS,
  SLIDE_DURATION,
  SLIDE_OVERLAY,
  TEXT_ALIGNS,
  type HomeLink,
} from "./home-core";
import { localizedStringSchema } from "./locale";
import { optionalMediaSchema } from "./media";
import { hrefSchema } from "./settings/fields";

export * from "./home-core";

/** Category or product handle, as in /c/<handle> and /p/<handle>. */
const handleSchema = z
  .string()
  .trim()
  .min(1, "home.link.handle")
  .max(200, "home.link.handle")
  .regex(/^[\p{L}\p{N}_-]+$/u, "home.link.handle");

/** Site path or http(s) URL: no javascript: or data: links on the storefront. */
const linkHrefSchema = hrefSchema.refine(
  (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
  "href.invalid",
);

export const homeLinkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("category"), handle: handleSchema }),
  z.object({ type: z.literal("product"), handle: handleSchema }),
  z.object({ type: z.literal("url"), href: linkHrefSchema }),
]);

// The zod-free HomeLink (home-core) must stay the schema output type.
type SameType<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const sameHomeLink: SameType<z.infer<typeof homeLinkSchema>, HomeLink> = true;
void sameHomeLink;

const rankSchema = z.number().int().min(0).max(10_000);

/** Hero slide as written by the admin. */
export const heroSlideInputSchema = z.object({
  active: z.boolean(),
  rank: rankSchema,
  /** 1920 x 900 recommended. */
  imageDesktop: optionalMediaSchema,
  /** 1080 x 1350 (4:5) recommended. */
  imageMobile: optionalMediaSchema,
  title: localizedStringSchema,
  subtitle: localizedStringSchema,
  ctaLabel: localizedStringSchema,
  link: homeLinkSchema.nullable(),
  textAlign: z.enum(TEXT_ALIGNS),
  /** Darkening layer over the image, in percent. */
  overlay: z.number().int().min(SLIDE_OVERLAY.min).max(SLIDE_OVERLAY.max),
  /** Display time before the next slide, in seconds. */
  durationSeconds: z.number().int().min(SLIDE_DURATION.min).max(SLIDE_DURATION.max),
});
export type HeroSlideInput = z.infer<typeof heroSlideInputSchema>;

export const heroSlideSchema = heroSlideInputSchema.extend({
  id: z.string(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;

/** Category banner (« Nos univers ») as written by the admin. */
export const categoryBannerInputSchema = z.object({
  active: z.boolean(),
  rank: rankSchema,
  /** 1200 x 1500 (4:5) recommended. */
  imageDesktop: optionalMediaSchema,
  /** 1080 x 1080 recommended. */
  imageMobile: optionalMediaSchema,
  title: localizedStringSchema,
  tagline: localizedStringSchema,
  /** Button text; the storefront has a default. */
  ctaLabel: localizedStringSchema,
  link: homeLinkSchema.nullable(),
});
export type CategoryBannerInput = z.infer<typeof categoryBannerInputSchema>;

export const categoryBannerSchema = categoryBannerInputSchema.extend({
  id: z.string(),
  updatedAt: z.iso.datetime({ offset: true }),
});
export type CategoryBanner = z.infer<typeof categoryBannerSchema>;

/** New order of a list: every id, first shown first. */
export const reorderInputSchema = z.object({
  ids: z
    .array(z.string().min(1))
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, "reorder.duplicate"),
});
export type ReorderInput = z.infer<typeof reorderInputSchema>;

/** Order and visibility of the home blocks (StoreSettings.homepage.sections). */
export const homeSectionsSchema = z
  .array(z.object({ id: z.enum(HOME_SECTION_IDS), enabled: z.boolean() }))
  .max(HOME_SECTION_IDS.length)
  .refine(
    (sections) => new Set(sections.map((section) => section.id)).size === sections.length,
    "home.sections.duplicate",
  );

export const SLIDER_TRANSITIONS = ["fade", "slide"] as const;
export type SliderTransition = (typeof SLIDER_TRANSITIONS)[number];

/** Slider behaviour shared by every slide (StoreSettings.homepage.slider). */
export const sliderOptionsSchema = z.object({
  transition: z.enum(SLIDER_TRANSITIONS),
  autoplay: z.boolean(),
});
export type SliderOptions = z.infer<typeof sliderOptionsSchema>;
