import { type ContrastIssue, generateTokens } from "@nocido/theme";
import { DEFAULT_STORE_SETTINGS } from "@nocido/theme/defaults";
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
  type StoreSettings,
  type StoreSettingsSection,
  type StoreSettingsUpdate,
  storeSettingsSchema,
  themeConfigSchema,
} from "@nocido/types";

/** The part of a zod schema used here (zod lives in @nocido/types). */
interface SectionSchema {
  safeParse(
    value: unknown,
  ): { success: true; data: unknown } | { success: false; error: { message: string } };
}

const SECTION_SCHEMAS: Record<StoreSettingsSection, SectionSchema> = {
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
};

type Section<K extends StoreSettingsSection> = StoreSettings[K];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Fallback events reported while reading stored settings. */
export interface HydrationIssue {
  section: StoreSettingsSection | "localization-rules";
  message: string;
}

/**
 * Turns whatever is stored into valid StoreSettings, never failing:
 * - a missing section or field takes the kit default;
 * - a section that no longer validates falls back to its default, and the
 *   problem is reported so the caller can log it.
 * `passwordSet` always reflects the encrypted column, not the JSON.
 */
export function hydrateSettings(
  stored: unknown,
  passwordSet: boolean,
): { settings: StoreSettings; issues: HydrationIssue[] } {
  const source = isRecord(stored) ? stored : {};
  const issues: HydrationIssue[] = [];
  const sections = {} as Record<StoreSettingsSection, unknown>;

  for (const [key, schema] of Object.entries(SECTION_SCHEMAS) as [
    StoreSettingsSection,
    SectionSchema,
  ][]) {
    const fallback = DEFAULT_STORE_SETTINGS[key];
    const value = source[key];
    const candidate = isRecord(value) ? { ...fallback, ...value } : fallback;
    const parsed = schema.safeParse(candidate);
    if (parsed.success) {
      sections[key] = parsed.data;
    } else {
      sections[key] = fallback;
      issues.push({ section: key, message: parsed.error.message });
    }
  }

  const updatedAt =
    typeof source.updatedAt === "string" ? source.updatedAt : DEFAULT_STORE_SETTINGS.updatedAt;
  const merged = {
    ...sections,
    smtp: { ...(sections.smtp as Section<"smtp">), passwordSet },
    updatedAt,
  };

  const full = storeSettingsSchema.safeParse(merged);
  if (full.success) return { settings: full.data, issues };

  // Only cross-section rules can fail here: they all live in localization.
  issues.push({ section: "localization-rules", message: full.error.message });
  return {
    settings: storeSettingsSchema.parse({
      ...merged,
      localization: DEFAULT_STORE_SETTINGS.localization,
    }),
    issues,
  };
}

/** What happens to the encrypted SMTP password on a write. */
export type PasswordChange =
  { action: "keep" } | { action: "clear" } | { action: "set"; value: string };

export class ThemeContrastError extends Error {
  constructor(readonly issues: ContrastIssue[]) {
    super("theme.contrast");
    this.name = "ThemeContrastError";
  }
}

/**
 * Merges a validated admin patch into the current settings. Each section is
 * merged shallowly, `contact.socials` one level deeper. The result is
 * validated with the full schema (throws a ZodError) and the theme must pass
 * the WCAG contrast checks (throws a ThemeContrastError).
 */
export function applyUpdate(
  current: StoreSettings,
  patch: StoreSettingsUpdate,
  now: Date = new Date(),
): { settings: StoreSettings; password: PasswordChange } {
  const { smtp: smtpPatch, contact: contactPatch, ...rest } = patch;

  let password: PasswordChange = { action: "keep" };
  let passwordSet = current.smtp.passwordSet;
  const { password: newPassword, ...smtpFields } = smtpPatch ?? {};
  if (newPassword === null) {
    password = { action: "clear" };
    passwordSet = false;
  } else if (typeof newPassword === "string") {
    password = { action: "set", value: newPassword };
    passwordSet = true;
  }

  const next: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) continue;
    next[key] = { ...current[key as keyof typeof rest], ...value };
  }
  if (contactPatch) {
    next.contact = {
      ...current.contact,
      ...contactPatch,
      socials: { ...current.contact.socials, ...contactPatch.socials },
    };
  }
  next.smtp = { ...current.smtp, ...smtpFields, passwordSet };
  next.updatedAt = now.toISOString();

  const settings = storeSettingsSchema.parse(next);
  const theme = generateTokens(settings.theme);
  if (!theme.ok) throw new ThemeContrastError(theme.issues);

  return { settings, password };
}

/** JSON persisted in the database: everything but the derived passwordSet flag. */
export function toStoredData(settings: StoreSettings): Record<string, unknown> {
  const { passwordSet: _passwordSet, ...smtp } = settings.smtp;
  return { ...settings, smtp };
}
