import { LOCALES } from "@nocido/types/client";
import { defineRouting } from "next-intl/routing";

/**
 * Static routing: every kit locale, always prefixed (/ar, /fr, /en).
 * Which locales are enabled and which one is the default come from
 * StoreSettings at request time (see src/middleware.ts).
 */
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: LOCALES[0],
  localePrefix: "always",
});
