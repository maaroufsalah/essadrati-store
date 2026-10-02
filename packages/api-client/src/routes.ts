/**
 * Kit API routes and cache tags, shared by the backend (which serves the
 * routes and triggers revalidation) and the clients (which fetch and tag).
 */
export const KIT_ROUTES = {
  storeSettings: "/store/store-settings",
  adminStoreSettings: "/admin/store-settings",
  pages: "/store/pages",
  adminPages: "/admin/pages",
  heroSlides: "/store/hero-slides",
  adminHeroSlides: "/admin/hero-slides",
  categoryBanners: "/store/category-banners",
  adminCategoryBanners: "/admin/category-banners",
  adminHomeLinks: "/admin/home-links",
  cities: "/store/cities",
  codOrders: "/store/cod/orders",
  codOrderLookup: "/store/cod/orders/lookup",
} as const;

/** Next.js cache tags. The backend revalidates them after each write. */
export const CACHE_TAGS = {
  storeSettings: "store-settings",
  pages: "pages",
  heroSlides: "hero-slides",
  categoryBanners: "category-banners",
  catalog: "catalog",
  cities: "cities",
} as const;
export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const LOCALE_HEADER = "x-medusa-locale";
export const PUBLISHABLE_KEY_HEADER = "x-publishable-api-key";
