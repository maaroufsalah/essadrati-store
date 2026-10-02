import {
  type HeroSlide,
  type HeroSlideInput,
  homeLinkSchema,
  localizedStringSchema,
  optionalMediaSchema,
  SLIDE_DURATION,
  SLIDE_OVERLAY,
} from "@nocido/types";

/** Row as stored by the hero_slide model. */
export interface HeroSlideRecord {
  id: string;
  active: boolean;
  rank: number;
  image_desktop: unknown;
  image_mobile: unknown;
  title: unknown;
  subtitle: unknown;
  cta_label: unknown;
  link: unknown;
  text_align: "start" | "center" | "end";
  overlay: number;
  duration_seconds: number;
  updated_at: Date | string;
}

const clamp = (value: number, { min, max }: { min: number; max: number }) =>
  Math.min(max, Math.max(min, Math.round(value)));

/** Record -> API shape. Invalid JSON degrades to empty values, never throws. */
export function toHeroSlide(record: HeroSlideRecord): HeroSlide {
  return {
    id: record.id,
    active: record.active,
    rank: record.rank,
    imageDesktop: optionalMediaSchema.catch(null).parse(record.image_desktop),
    imageMobile: optionalMediaSchema.catch(null).parse(record.image_mobile),
    title: localizedStringSchema.catch({}).parse(record.title),
    subtitle: localizedStringSchema.catch({}).parse(record.subtitle),
    ctaLabel: localizedStringSchema.catch({}).parse(record.cta_label),
    link: homeLinkSchema.nullable().catch(null).parse(record.link),
    textAlign: record.text_align,
    overlay: clamp(record.overlay, SLIDE_OVERLAY),
    durationSeconds: clamp(record.duration_seconds, SLIDE_DURATION),
    updatedAt: new Date(record.updated_at).toISOString(),
  };
}

/** API input -> model data. */
export function toHeroSlideData(input: HeroSlideInput) {
  return {
    active: input.active,
    rank: input.rank,
    image_desktop: input.imageDesktop,
    image_mobile: input.imageMobile,
    title: input.title,
    subtitle: input.subtitle,
    cta_label: input.ctaLabel,
    link: input.link,
    text_align: input.textAlign,
    overlay: input.overlay,
    duration_seconds: input.durationSeconds,
  };
}
