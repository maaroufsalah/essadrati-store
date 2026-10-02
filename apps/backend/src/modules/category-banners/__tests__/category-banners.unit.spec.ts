import { categoryBannerInputSchema } from "@nocido/types";
import { describe, expect, it } from "vitest";
import { type CategoryBannerRecord, toCategoryBanner, toCategoryBannerData } from "../lib";

const record: CategoryBannerRecord = {
  id: "cbanner_1",
  active: false,
  rank: 1,
  image_desktop: null,
  image_mobile: { id: "file_2", url: "http://localhost:9000/static/amlou.svg" },
  title: { fr: "Amlou" },
  tagline: { fr: "Amandes, argan et miel" },
  cta_label: {},
  link: { type: "product", handle: "amlou-louz" },
  updated_at: "2026-10-02T10:00:00.000Z",
};

describe("category banners", () => {
  it("maps a record to the API shape and back", () => {
    const banner = toCategoryBanner(record);
    expect(banner).toMatchObject({
      active: false,
      imageMobile: { url: "http://localhost:9000/static/amlou.svg" },
      link: { type: "product", handle: "amlou-louz" },
    });
    expect(toCategoryBannerData(categoryBannerInputSchema.parse(banner))).toMatchObject({
      tagline: { fr: "Amandes, argan et miel" },
      image_desktop: null,
    });
  });

  it("degrades invalid JSON to empty values", () => {
    const banner = toCategoryBanner({ ...record, tagline: 42, link: { type: "page" } });
    expect(banner.tagline).toEqual({});
    expect(banner.link).toBeNull();
  });
});
