import {
  type CategoryBanner,
  type CategoryBannerInput,
  homeLinkSchema,
  localizedStringSchema,
  optionalMediaSchema,
} from "@nocido/types";

/** Row as stored by the category_banner model. */
export interface CategoryBannerRecord {
  id: string;
  active: boolean;
  rank: number;
  image_desktop: unknown;
  image_mobile: unknown;
  title: unknown;
  tagline: unknown;
  cta_label: unknown;
  link: unknown;
  updated_at: Date | string;
}

/** Record -> API shape. Invalid JSON degrades to empty values, never throws. */
export function toCategoryBanner(record: CategoryBannerRecord): CategoryBanner {
  return {
    id: record.id,
    active: record.active,
    rank: record.rank,
    imageDesktop: optionalMediaSchema.catch(null).parse(record.image_desktop),
    imageMobile: optionalMediaSchema.catch(null).parse(record.image_mobile),
    title: localizedStringSchema.catch({}).parse(record.title),
    tagline: localizedStringSchema.catch({}).parse(record.tagline),
    ctaLabel: localizedStringSchema.catch({}).parse(record.cta_label),
    link: homeLinkSchema.nullable().catch(null).parse(record.link),
    updatedAt: new Date(record.updated_at).toISOString(),
  };
}

/** API input -> model data. */
export function toCategoryBannerData(input: CategoryBannerInput) {
  return {
    active: input.active,
    rank: input.rank,
    image_desktop: input.imageDesktop,
    image_mobile: input.imageMobile,
    title: input.title,
    tagline: input.tagline,
    cta_label: input.ctaLabel,
    link: input.link,
  };
}
