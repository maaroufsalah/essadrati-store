import Medusa, { type Config } from "@medusajs/js-sdk";
import {
  type CategoryBanner,
  categoryBannerSchema,
  type HeroSlide,
  heroSlideSchema,
  type Locale,
  type Page,
  type PageSummary,
  pageSchema,
  pageSummarySchema,
  type PublicStoreSettings,
  parsePublicStoreSettings,
  parsePublicStoreSettingsWithFallback,
  toMedusaLocale,
} from "@nocido/types";
import { type ApiError, type ApiResult, toApiError } from "./errors";
import { CACHE_TAGS, KIT_ROUTES, LOCALE_HEADER } from "./routes";

export interface StoreClientOptions {
  /** Medusa backend URL, without trailing slash. */
  baseUrl: string;
  publishableKey: string;
  /**
   * Kit locale and store country. Both are needed to build the Medusa
   * locale tag (ar + MA -> ar-MA) sent with every request.
   */
  locale?: { locale: Locale; country: string };
  /**
   * Defaults used section by section when the settings payload is
   * incomplete or partly invalid (version skew between apps). Without it,
   * any invalid payload is an `invalidResponse` error.
   */
  settingsFallback?: PublicStoreSettings;
  /** JWT storage. Server: "nostore" (default). Browser: "local". Expo: "custom". */
  auth?: Config["auth"];
  debug?: boolean;
}

/** Next.js extension of fetch options. */
export interface NextFetchOptions {
  next?: { tags?: string[]; revalidate?: number | false };
}

/**
 * Extra options forwarded to `fetch`, e.g. Next.js
 * `{ next: { tags, revalidate } }` or `{ cache: "no-store" }`.
 */
export type RequestOptions = Omit<RequestInit, "headers" | "body" | "method"> & NextFetchOptions;

export interface StoreClient {
  /** The Medusa JS SDK, for every standard store endpoint. */
  sdk: Medusa;
  /** Medusa locale tag sent with each request, or null. */
  medusaLocale: string | null;
  /**
   * Public StoreSettings, validated with the shared zod schema. With
   * `settingsFallback`, `warnings` lists the sections that fell back.
   */
  getStoreSettings(
    options?: RequestOptions,
  ): Promise<ApiResult<PublicStoreSettings> & { warnings?: string[] }>;
  /** Published CMS pages without content (footer, sitemap), tagged `pages`. */
  listPages(options?: RequestOptions): Promise<ApiResult<PageSummary[]>>;
  /** One published CMS page, tagged `pages`. An unknown handle is `notFound`. */
  getPage(handle: string, options?: RequestOptions): Promise<ApiResult<Page>>;
  /**
   * Active hero slides by rank, tagged `hero-slides`. An invalid slide is
   * dropped (and counted in `skipped`) instead of failing the whole list.
   */
  listHeroSlides(options?: RequestOptions): Promise<ApiResult<HeroSlide[]> & { skipped?: number }>;
  /** Active category banners by rank, tagged `category-banners`. Same tolerance. */
  listCategoryBanners(
    options?: RequestOptions,
  ): Promise<ApiResult<CategoryBanner[]> & { skipped?: number }>;
}

function invalid(message: string): { ok: false; error: ApiError } {
  return { ok: false, error: { code: "invalidResponse", status: 200, message } };
}

/** Adds kit cache tags to the Next.js fetch options, keeping the caller's tags. */
function withTags(options: RequestOptions | undefined, tags: readonly string[]): RequestOptions {
  const next = options?.next;
  return { ...options, next: { ...next, tags: [...new Set([...(next?.tags ?? []), ...tags])] } };
}

interface ItemSchema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

/** Keeps the valid entries of a list. Not an array at all: invalid response. */
function validItems<T>(
  value: unknown,
  schema: ItemSchema<T>,
): (ApiResult<T[]> & { skipped?: number }) | { ok: false; error: ApiError } {
  if (!Array.isArray(value)) return invalid("expected an array");
  const data: T[] = [];
  for (const entry of value) {
    const parsed = schema.safeParse(entry);
    if (parsed.success) data.push(parsed.data);
  }
  const skipped = value.length - data.length;
  return skipped > 0 ? { ok: true, data, skipped } : { ok: true, data };
}

/**
 * Creates a client bound to one locale. It is cheap: on the server, create
 * one per request rather than sharing an instance whose locale changes.
 */
export function createStoreClient(options: StoreClientOptions): StoreClient {
  const medusaLocale = options.locale
    ? toMedusaLocale(options.locale.locale, options.locale.country)
    : null;

  const sdk = new Medusa({
    baseUrl: options.baseUrl,
    publishableKey: options.publishableKey,
    globalHeaders: medusaLocale ? { [LOCALE_HEADER]: medusaLocale } : {},
    auth: options.auth ?? { type: "jwt", jwtTokenStorageMethod: "nostore" },
    debug: options.debug ?? false,
  });

  return {
    sdk,
    medusaLocale,
    async getStoreSettings(requestOptions) {
      try {
        const body = await sdk.client.fetch<{ settings?: unknown }>(KIT_ROUTES.storeSettings, {
          method: "GET",
          ...withTags(requestOptions, [CACHE_TAGS.storeSettings]),
        });
        if (options.settingsFallback) {
          const lenient = parsePublicStoreSettingsWithFallback(
            body.settings,
            options.settingsFallback,
          );
          return { ok: true, data: lenient.data, warnings: lenient.issues };
        }
        const parsed = parsePublicStoreSettings(body.settings);
        if (!parsed.ok) {
          return {
            ok: false,
            error: { code: "invalidResponse", status: 200, message: parsed.error.message },
          };
        }
        return { ok: true, data: parsed.data };
      } catch (error) {
        return { ok: false, error: toApiError(error) };
      }
    },
    async listPages(requestOptions) {
      try {
        const body = await sdk.client.fetch<{ pages?: unknown }>(KIT_ROUTES.pages, {
          method: "GET",
          ...withTags(requestOptions, [CACHE_TAGS.pages]),
        });
        const parsed = pageSummarySchema.array().safeParse(body.pages);
        return parsed.success ? { ok: true, data: parsed.data } : invalid(parsed.error.message);
      } catch (error) {
        return { ok: false, error: toApiError(error) };
      }
    },
    async getPage(handle, requestOptions) {
      try {
        const body = await sdk.client.fetch<{ page?: unknown }>(
          `${KIT_ROUTES.pages}/${encodeURIComponent(handle)}`,
          { method: "GET", ...withTags(requestOptions, [CACHE_TAGS.pages]) },
        );
        const parsed = pageSchema.safeParse(body.page);
        return parsed.success ? { ok: true, data: parsed.data } : invalid(parsed.error.message);
      } catch (error) {
        return { ok: false, error: toApiError(error) };
      }
    },
    async listHeroSlides(requestOptions) {
      try {
        const body = await sdk.client.fetch<{ slides?: unknown }>(KIT_ROUTES.heroSlides, {
          method: "GET",
          ...withTags(requestOptions, [CACHE_TAGS.heroSlides]),
        });
        return validItems(body.slides, heroSlideSchema);
      } catch (error) {
        return { ok: false, error: toApiError(error) };
      }
    },
    async listCategoryBanners(requestOptions) {
      try {
        const body = await sdk.client.fetch<{ banners?: unknown }>(KIT_ROUTES.categoryBanners, {
          method: "GET",
          ...withTags(requestOptions, [CACHE_TAGS.categoryBanners]),
        });
        return validItems(body.banners, categoryBannerSchema);
      } catch (error) {
        return { ok: false, error: toApiError(error) };
      }
    },
  };
}
