import { heroSlideInputSchema } from "@nocido/types";
import { describe, expect, it } from "vitest";
import { rankUpdates } from "../../../lib/reorder";
import { type HeroSlideRecord, toHeroSlide, toHeroSlideData } from "../lib";

const record: HeroSlideRecord = {
  id: "hslide_1",
  active: true,
  rank: 2,
  image_desktop: { id: "file_1", url: "http://localhost:9000/static/hero.svg" },
  image_mobile: null,
  title: { fr: "Miel", ar: "عسل" },
  subtitle: {},
  cta_label: { fr: "Découvrir" },
  link: { type: "category", handle: "asal-hor" },
  text_align: "center",
  overlay: 30,
  duration_seconds: 6,
  updated_at: new Date("2026-10-02T10:00:00.000Z"),
};

describe("hero slides", () => {
  it("maps a record to the API shape and back", () => {
    const slide = toHeroSlide(record);
    expect(slide).toMatchObject({
      rank: 2,
      textAlign: "center",
      link: { type: "category", handle: "asal-hor" },
      updatedAt: "2026-10-02T10:00:00.000Z",
    });
    const input = heroSlideInputSchema.parse(slide);
    expect(toHeroSlideData(input)).toMatchObject({ cta_label: { fr: "Découvrir" }, rank: 2 });
  });

  it("degrades invalid JSON and clamps out-of-range numbers", () => {
    const slide = toHeroSlide({
      ...record,
      title: "broken",
      image_desktop: { url: "not a url" },
      link: { type: "url", href: "javascript:alert(1)" },
      overlay: 95,
      duration_seconds: 1,
    });
    expect(slide.title).toEqual({});
    expect(slide.imageDesktop).toBeNull();
    expect(slide.link).toBeNull();
    expect(slide.overlay).toBe(60);
    expect(slide.durationSeconds).toBe(3);
  });
});

describe("reorder", () => {
  it("ranks every id in the given order", () => {
    expect(rankUpdates(["a", "b", "c"], ["c", "a", "b"])).toEqual([
      { id: "c", rank: 0 },
      { id: "a", rank: 1 },
      { id: "b", rank: 2 },
    ]);
  });

  it("refuses a stale or partial list", () => {
    expect(rankUpdates(["a", "b"], ["a"])).toBeNull();
    expect(rankUpdates(["a", "b"], ["a", "x"])).toBeNull();
    expect(rankUpdates(["a", "b"], ["a", "a"])).toBeNull();
  });
});
