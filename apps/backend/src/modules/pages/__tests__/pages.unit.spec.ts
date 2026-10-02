import { pageInputSchema } from "@nocido/types";
import { describe, expect, it } from "vitest";
import { type CmsPageRecord, toPage, toRecordData } from "../lib";

const record: CmsPageRecord = {
  id: "page_1",
  handle: "faq",
  title: { fr: "FAQ", ar: "الأسئلة" },
  content: { fr: "## Q" },
  seo: { metaTitle: { fr: "FAQ" }, metaDescription: {} },
  status: "published",
  show_in_footer: true,
  footer_rank: 2,
  published_at: "2026-10-01T10:00:00.000Z",
  updated_at: new Date("2026-10-02T10:00:00.000Z"),
};

describe("pages", () => {
  it("maps a record to the API shape", () => {
    expect(toPage(record)).toMatchObject({
      handle: "faq",
      title: { fr: "FAQ", ar: "الأسئلة" },
      showInFooter: true,
      publishedAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
    });
  });

  it("degrades invalid JSON to empty values instead of failing", () => {
    const page = toPage({ ...record, title: "broken", seo: null });
    expect(page.title).toEqual({});
    expect(page.seo).toEqual({ metaTitle: {}, metaDescription: {} });
  });

  it("keeps the first publication date and clears it for drafts", () => {
    const input = pageInputSchema.parse({ ...toPage(record), status: "published" });
    const now = new Date("2026-12-01T00:00:00.000Z");
    expect(toRecordData(input, record, now).published_at?.toISOString()).toBe(
      "2026-10-01T10:00:00.000Z",
    );
    expect(toRecordData(input, null, now).published_at).toEqual(now);
    expect(toRecordData({ ...input, status: "draft" }, record, now).published_at).toBeNull();
  });

  it("validates handles", () => {
    expect(pageInputSchema.shape.handle.safeParse("our-story").success).toBe(true);
    expect(pageInputSchema.shape.handle.safeParse("Our Story").success).toBe(false);
    expect(pageInputSchema.shape.handle.safeParse("-x").success).toBe(false);
  });
});
