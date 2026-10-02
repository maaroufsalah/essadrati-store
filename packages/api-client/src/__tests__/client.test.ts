import { DEFAULT_PUBLIC_STORE_SETTINGS } from "@nocido/theme/defaults";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createStoreClient } from "../client";
import { CACHE_TAGS, KIT_ROUTES, LOCALE_HEADER, PUBLISHABLE_KEY_HEADER } from "../routes";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function stubFetch(response: Response) {
  const spy = vi.fn<typeof fetch>().mockResolvedValue(response);
  vi.stubGlobal("fetch", spy);
  return spy;
}

const options = {
  baseUrl: "http://backend.test",
  publishableKey: "pk_test",
  locale: { locale: "ar" as const, country: "ma" },
};

type NextInit = RequestInit & { next?: { tags?: string[]; revalidate?: number } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createStoreClient", () => {
  it("sends the publishable key and the Medusa locale", async () => {
    const spy = stubFetch(json({ settings: DEFAULT_PUBLIC_STORE_SETTINGS }));
    const client = createStoreClient(options);
    expect(client.medusaLocale).toBe("ar-MA");

    await client.getStoreSettings();

    const [input, init] = spy.mock.calls[0] ?? [];
    expect(input instanceof Request ? input.url : input?.toString()).toBe(
      `http://backend.test${KIT_ROUTES.storeSettings}`,
    );
    const headers = new Headers(init?.headers);
    expect(headers.get(PUBLISHABLE_KEY_HEADER)).toBe("pk_test");
    expect(headers.get(LOCALE_HEADER)).toBe("ar-MA");
  });

  it("omits the locale header when no locale is given", async () => {
    const spy = stubFetch(json({ settings: DEFAULT_PUBLIC_STORE_SETTINGS }));
    const client = createStoreClient({ ...options, locale: undefined });
    await client.getStoreSettings();
    const headers = new Headers(spy.mock.calls[0]?.[1]?.headers);
    expect(client.medusaLocale).toBeNull();
    expect(headers.get(LOCALE_HEADER)).toBeFalsy();
  });

  it("tags the settings request for Next.js revalidation", async () => {
    const spy = stubFetch(json({ settings: DEFAULT_PUBLIC_STORE_SETTINGS }));
    await createStoreClient(options).getStoreSettings({
      next: { tags: ["custom"], revalidate: 60 },
    });

    const init = spy.mock.calls[0]?.[1] as NextInit;
    expect(init.next?.tags).toEqual(["custom", CACHE_TAGS.storeSettings]);
    expect(init.next?.revalidate).toBe(60);
  });

  it("returns validated settings", async () => {
    stubFetch(json({ settings: DEFAULT_PUBLIC_STORE_SETTINGS }));
    const result = await createStoreClient(options).getStoreSettings();
    expect(result.ok && result.data.localization.defaultCurrency).toBe("MAD");
  });

  it("rejects a payload that does not match the schema", async () => {
    stubFetch(json({ settings: { identity: {} } }));
    const result = await createStoreClient(options).getStoreSettings();
    expect(result.ok ? null : result.error.code).toBe("invalidResponse");
  });

  it("falls back section by section when a fallback is given", async () => {
    const { homepage: _homepage, ...older } = DEFAULT_PUBLIC_STORE_SETTINGS;
    stubFetch(json({ settings: { ...older, commerce: { ...older.commerce, returnDays: 14 } } }));
    const result = await createStoreClient({
      ...options,
      settingsFallback: DEFAULT_PUBLIC_STORE_SETTINGS,
    }).getStoreSettings();
    expect(result.ok && result.data.commerce.returnDays).toBe(14);
    expect(result.ok && result.data.homepage).toEqual(DEFAULT_PUBLIC_STORE_SETTINGS.homepage);
    expect(result.warnings).toEqual(["homepage"]);
  });

  it("normalizes HTTP errors", async () => {
    stubFetch(json({ message: "Not found" }, 404));
    const result = await createStoreClient(options).getStoreSettings();
    expect(result.ok ? null : result.error).toMatchObject({ code: "notFound", status: 404 });
  });

  it("normalizes network errors", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")));
    const result = await createStoreClient(options).getStoreSettings();
    expect(result.ok ? null : result.error.code).toBe("network");
  });
});

describe("CMS pages", () => {
  const page = {
    id: "page_1",
    handle: "faq",
    title: { fr: "FAQ" },
    content: { fr: "## Question" },
    seo: { metaTitle: {}, metaDescription: {} },
    status: "published",
    showInFooter: true,
    footerRank: 1,
    publishedAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  };

  it("lists published pages under the pages tag", async () => {
    const { content: _content, seo: _seo, status: _status, publishedAt: _at, ...summary } = page;
    const spy = stubFetch(json({ pages: [summary] }));
    const result = await createStoreClient(options).listPages();
    expect(result.ok ? result.data.map((entry) => entry.handle) : null).toEqual(["faq"]);
    const [input, init] = spy.mock.calls[0] ?? [];
    expect(input instanceof Request ? input.url : input?.toString()).toBe(
      `http://backend.test${KIT_ROUTES.pages}`,
    );
    expect((init as NextInit).next?.tags).toEqual([CACHE_TAGS.pages]);
  });

  it("returns one validated page", async () => {
    stubFetch(json({ page }));
    const result = await createStoreClient(options).getPage("faq");
    expect(result.ok ? result.data.content.fr : null).toBe("## Question");
  });

  it("reports an unknown page as notFound", async () => {
    stubFetch(json({ message: "page.notFound" }, 404));
    const result = await createStoreClient(options).getPage("nope");
    expect(result.ok ? null : result.error.code).toBe("notFound");
  });
});

describe("home content", () => {
  const slide = {
    id: "hslide_1",
    active: true,
    rank: 0,
    imageDesktop: null,
    imageMobile: null,
    title: { fr: "Miel" },
    subtitle: {},
    ctaLabel: {},
    link: { type: "category", handle: "asal-hor" },
    textAlign: "center",
    overlay: 30,
    durationSeconds: 6,
    updatedAt: "2026-10-01T10:00:00.000Z",
  };

  it("lists hero slides under their tag and drops invalid ones", async () => {
    const spy = stubFetch(json({ slides: [slide, { ...slide, id: "bad", overlay: 99 }] }));
    const result = await createStoreClient(options).listHeroSlides();
    expect(result.ok ? result.data.map((entry) => entry.id) : null).toEqual(["hslide_1"]);
    expect(result.skipped).toBe(1);
    const [input, init] = spy.mock.calls[0] ?? [];
    expect(input instanceof Request ? input.url : input?.toString()).toBe(
      `http://backend.test${KIT_ROUTES.heroSlides}`,
    );
    expect((init as NextInit).next?.tags).toEqual([CACHE_TAGS.heroSlides]);
  });

  it("lists category banners under their tag", async () => {
    const { subtitle: _s, textAlign: _a, overlay: _o, durationSeconds: _d, ...base } = slide;
    const spy = stubFetch(json({ banners: [{ ...base, id: "cbanner_1", tagline: {} }] }));
    const result = await createStoreClient(options).listCategoryBanners();
    expect(result.ok ? result.data[0]?.id : null).toBe("cbanner_1");
    const [, init] = spy.mock.calls[0] ?? [];
    expect((init as NextInit).next?.tags).toEqual([CACHE_TAGS.categoryBanners]);
  });

  it("rejects a payload that is not a list", async () => {
    stubFetch(json({ slides: null }));
    const result = await createStoreClient(options).listHeroSlides();
    expect(result.ok ? null : result.error.code).toBe("invalidResponse");
  });
});
