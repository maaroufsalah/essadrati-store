/*
 * Home page building blocks without zod, safe for client bundles
 * (@nocido/types/client). home.ts adds the schemas.
 */

/** Text alignment of a hero slide, in logical terms (start is right in Arabic). */
export const TEXT_ALIGNS = ["start", "center", "end"] as const;
export type TextAlign = (typeof TEXT_ALIGNS)[number];

/** What a slide or a banner links to. */
export const HOME_LINK_TYPES = ["category", "product", "url"] as const;
export type HomeLinkType = (typeof HOME_LINK_TYPES)[number];

export type HomeLink =
  | { type: "category"; handle: string }
  | { type: "product"; handle: string }
  | { type: "url"; href: string };

/** Storefront path (without locale) or absolute URL of a link. */
export function homeLinkHref(link: HomeLink | null | undefined): string | null {
  if (!link) return null;
  switch (link.type) {
    case "category":
      return `/c/${encodeURIComponent(link.handle)}`;
    case "product":
      return `/p/${encodeURIComponent(link.handle)}`;
    case "url":
      return link.href;
  }
}

/** True for links leaving the storefront (opened without the locale prefix). */
export function isExternalHref(href: string): boolean {
  return !href.startsWith("/");
}

/**
 * Home page blocks the admin can reorder and switch off. A kit update may
 * add blocks: `normalizeHomeSections` appends the ones a store does not
 * know yet.
 */
export const HOME_SECTION_IDS = [
  "slider",
  "trust",
  "categories",
  "bestsellers",
  "story",
  "gifts",
  "testimonials",
] as const;
export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export interface HomeSection {
  id: HomeSectionId;
  enabled: boolean;
}

export const DEFAULT_HOME_SECTIONS: readonly HomeSection[] = HOME_SECTION_IDS.map((id) => ({
  id,
  enabled: true,
}));

/**
 * Stored order first (duplicates and unknown ids dropped), then every block
 * missing from it, enabled, in kit order.
 */
export function normalizeHomeSections(
  sections: readonly { id: string; enabled: boolean }[] | null | undefined,
): HomeSection[] {
  const seen = new Set<HomeSectionId>();
  const result: HomeSection[] = [];
  for (const section of sections ?? []) {
    const id = section.id as HomeSectionId;
    if (!HOME_SECTION_IDS.includes(id) || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, enabled: section.enabled });
  }
  for (const id of HOME_SECTION_IDS) {
    if (!seen.has(id)) result.push({ id, enabled: true });
  }
  return result;
}

/** Items shown on the storefront: active ones, by rank (stable for equal ranks). */
export function activeByRank<T extends { active: boolean; rank: number }>(
  items: readonly T[],
): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.active)
    .sort((a, b) => a.item.rank - b.item.rank || a.index - b.index)
    .map(({ item }) => item);
}

/** Slider defaults and bounds (seconds, percent). */
export const SLIDE_DURATION = { min: 3, max: 20, default: 6 } as const;
export const SLIDE_OVERLAY = { min: 0, max: 60, default: 30 } as const;

/** Recommended upload sizes, shown in the admin. */
export const HOME_IMAGE_SIZES = {
  slideDesktop: { width: 1920, height: 900 },
  slideMobile: { width: 1080, height: 1350 },
  bannerDesktop: { width: 1200, height: 1500 },
  bannerMobile: { width: 1080, height: 1080 },
} as const;
