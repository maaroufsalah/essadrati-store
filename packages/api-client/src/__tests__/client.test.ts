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
