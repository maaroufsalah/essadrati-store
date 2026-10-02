import { describe, expect, it } from "vitest";
import {
  activeByRank,
  DEFAULT_HOME_SECTIONS,
  heroSlideInputSchema,
  homeLinkHref,
  homeLinkSchema,
  homeSectionsSchema,
  normalizeHomeSections,
  reorderInputSchema,
} from "../index";

const slide = {
  active: true,
  rank: 0,
  imageDesktop: null,
  imageMobile: null,
  title: { fr: "Miel" },
  subtitle: {},
  ctaLabel: {},
  link: { type: "category", handle: "asal-hor" },
  textAlign: "start",
  overlay: 30,
  durationSeconds: 6,
} as const;

describe("home links", () => {
  it("builds storefront paths and keeps URLs", () => {
    expect(homeLinkHref({ type: "category", handle: "amlou" })).toBe("/c/amlou");
    expect(homeLinkHref({ type: "product", handle: "asal-ferrane" })).toBe("/p/asal-ferrane");
    expect(homeLinkHref({ type: "url", href: "https://wa.me/212600000000" })).toBe(
      "https://wa.me/212600000000",
    );
    expect(homeLinkHref(null)).toBeNull();
  });

  it("rejects handles with paths and invalid URLs", () => {
    expect(homeLinkSchema.safeParse({ type: "category", handle: "../admin" }).success).toBe(false);
    expect(homeLinkSchema.safeParse({ type: "url", href: "javascript:alert(1)" }).success).toBe(
      false,
    );
    expect(homeLinkSchema.safeParse({ type: "url", href: "/fr/faq" }).success).toBe(true);
  });
});

describe("hero slides", () => {
  it("bounds the overlay and the duration", () => {
    expect(heroSlideInputSchema.safeParse(slide).success).toBe(true);
    expect(heroSlideInputSchema.safeParse({ ...slide, overlay: 61 }).success).toBe(false);
    expect(heroSlideInputSchema.safeParse({ ...slide, durationSeconds: 2 }).success).toBe(false);
    expect(heroSlideInputSchema.safeParse({ ...slide, textAlign: "left" }).success).toBe(false);
  });

  it("keeps active items by rank, stable for equal ranks", () => {
    const items = [
      { id: "c", active: true, rank: 2 },
      { id: "off", active: false, rank: 0 },
      { id: "a", active: true, rank: 1 },
      { id: "b", active: true, rank: 1 },
    ];
    expect(activeByRank(items).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("refuses duplicate ids in a reorder", () => {
    expect(reorderInputSchema.safeParse({ ids: ["a", "b"] }).success).toBe(true);
    expect(reorderInputSchema.safeParse({ ids: ["a", "a"] }).success).toBe(false);
  });
});

describe("home sections", () => {
  it("refuses duplicates", () => {
    expect(
      homeSectionsSchema.safeParse([
        { id: "trust", enabled: true },
        { id: "trust", enabled: false },
      ]).success,
    ).toBe(false);
  });

  it("keeps the stored order and appends blocks added by the kit", () => {
    const normalized = normalizeHomeSections([
      { id: "story", enabled: false },
      { id: "unknown", enabled: true },
      { id: "slider", enabled: true },
    ]);
    expect(normalized.slice(0, 2)).toEqual([
      { id: "story", enabled: false },
      { id: "slider", enabled: true },
    ]);
    expect(normalized).toHaveLength(DEFAULT_HOME_SECTIONS.length);
    expect(normalized.slice(2).every((section) => section.enabled)).toBe(true);
  });
});
