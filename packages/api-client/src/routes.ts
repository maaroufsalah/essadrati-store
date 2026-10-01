/**
 * Kit API routes and cache tags, shared by the backend (which serves the
 * routes and triggers revalidation) and the clients (which fetch and tag).
 */
export const KIT_ROUTES = {
  storeSettings: "/store/store-settings",
  adminStoreSettings: "/admin/store-settings",
} as const;

/** Next.js cache tags. The backend revalidates them after each write. */
export const CACHE_TAGS = {
  storeSettings: "store-settings",
} as const;
export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const LOCALE_HEADER = "x-medusa-locale";
export const PUBLISHABLE_KEY_HEADER = "x-publishable-api-key";
