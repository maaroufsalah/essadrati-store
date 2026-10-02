import { z } from "zod";
import { catalogSettingsSchema } from "../catalog";
import { themeConfigSchema } from "../theme";
import {
  billingSchema,
  commerceSchema,
  contactSchema,
  homepageSchema,
  identitySchema,
  localizationSchema,
  marketingSchema,
  seoSchema,
  smtpSchema,
  smtpUpdateSchema,
  socialsSchema,
} from "./sections";

/** Section keys, in the order the admin shows them. */
export const STORE_SETTINGS_SECTIONS = [
  "identity",
  "contact",
  "billing",
  "localization",
  "theme",
  "commerce",
  "smtp",
  "marketing",
  "seo",
  "homepage",
  "catalog",
] as const;
export type StoreSettingsSection = (typeof STORE_SETTINGS_SECTIONS)[number];

interface LocalizationLike {
  localization: { defaultLocale: string; enabledLocales: string[] };
}

/** Cross-section rules shared by the admin and public shapes. */
function checkLocales(value: LocalizationLike, ctx: z.RefinementCtx): void {
  const { defaultLocale, enabledLocales } = value.localization;
  if (!enabledLocales.includes(defaultLocale)) {
    ctx.addIssue({
      code: "custom",
      path: ["localization", "enabledLocales"],
      message: "localization.defaultNotEnabled",
    });
  }
  if (new Set(enabledLocales).size !== enabledLocales.length) {
    ctx.addIssue({
      code: "custom",
      path: ["localization", "enabledLocales"],
      message: "localization.duplicate",
    });
  }
}

const storeSettingsShape = {
  identity: identitySchema,
  contact: contactSchema,
  billing: billingSchema,
  localization: localizationSchema,
  theme: themeConfigSchema,
  commerce: commerceSchema,
  smtp: smtpSchema,
  marketing: marketingSchema,
  seo: seoSchema,
  homepage: homepageSchema,
  catalog: catalogSettingsSchema,
  /** ISO timestamp of the last write. Also used as the cache version. */
  updatedAt: z.iso.datetime({ offset: true }),
};

/** Full settings, as returned by the admin API. */
export const storeSettingsSchema = z.object(storeSettingsShape).superRefine(checkLocales);
export type StoreSettings = z.infer<typeof storeSettingsSchema>;

/**
 * Settings exposed by the public store API: no SMTP, no bank details, no
 * technical email domain.
 */
export const publicStoreSettingsSchema = z
  .object({
    ...storeSettingsShape,
    billing: billingSchema.omit({ bankName: true, rib: true }),
    commerce: commerceSchema.omit({ technicalEmailDomain: true }),
  })
  .omit({ smtp: true })
  .superRefine(checkLocales);
export type PublicStoreSettings = z.infer<typeof publicStoreSettingsSchema>;

/**
 * Admin write payload. Every section is optional and each section is
 * partial, so a settings page sends only what it edits. Unknown keys are
 * rejected. The backend merges the payload with the stored settings, then
 * validates the result with `storeSettingsSchema`.
 */
export const storeSettingsUpdateSchema = z.strictObject({
  identity: identitySchema.partial().optional(),
  contact: contactSchema.extend({ socials: socialsSchema.partial() }).partial().optional(),
  billing: billingSchema.partial().optional(),
  localization: localizationSchema.partial().optional(),
  theme: themeConfigSchema.partial().optional(),
  commerce: commerceSchema.partial().optional(),
  smtp: smtpUpdateSchema.optional(),
  marketing: marketingSchema.partial().optional(),
  seo: seoSchema.partial().optional(),
  homepage: homepageSchema.partial().optional(),
  catalog: catalogSettingsSchema.partial().optional(),
});
export type StoreSettingsUpdate = z.infer<typeof storeSettingsUpdateSchema>;

/** Validates settings read from the public API. Never throws. */
export function parsePublicStoreSettings(
  input: unknown,
): { ok: true; data: PublicStoreSettings } | { ok: false; error: z.ZodError } {
  const result = publicStoreSettingsSchema.safeParse(input);
  return result.success ? { ok: true, data: result.data } : { ok: false, error: result.error };
}

/** Removes everything the public API must not expose. */
export function toPublicStoreSettings(settings: StoreSettings): PublicStoreSettings {
  const { smtp: _smtp, billing, commerce, ...rest } = settings;
  const { bankName: _bank, rib: _rib, ...publicBilling } = billing;
  const { technicalEmailDomain: _domain, ...publicCommerce } = commerce;
  return { ...rest, billing: publicBilling, commerce: publicCommerce };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Tolerant read of the public settings: each section that is missing or
 * invalid (an older or newer backend, a partial cache entry) takes the
 * matching section of `fallback`, the rest is kept. Never throws.
 * `issues` lists the sections that fell back.
 */
export function parsePublicStoreSettingsWithFallback(
  input: unknown,
  fallback: PublicStoreSettings,
): { data: PublicStoreSettings; issues: string[] } {
  const strict = publicStoreSettingsSchema.safeParse(input);
  if (strict.success) return { data: strict.data, issues: [] };

  const source = isRecord(input) ? input : {};
  const shape = publicStoreSettingsSchema.shape;
  const issues: string[] = [];
  const merged: Record<string, unknown> = {};
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const fallbackValue = fallback[key];
    const value = source[key];
    if (value === undefined) {
      merged[key] = fallbackValue;
      issues.push(key);
      continue;
    }
    const candidate =
      isRecord(value) && isRecord(fallbackValue) ? { ...fallbackValue, ...value } : value;
    const parsed = shape[key].safeParse(candidate);
    if (parsed.success) {
      merged[key] = parsed.data;
    } else {
      merged[key] = fallbackValue;
      issues.push(key);
    }
  }
  const full = publicStoreSettingsSchema.safeParse(merged);
  if (full.success) return { data: full.data, issues };
  return {
    data: publicStoreSettingsSchema.parse({ ...merged, localization: fallback.localization }),
    issues: [...issues, "localization"],
  };
}
