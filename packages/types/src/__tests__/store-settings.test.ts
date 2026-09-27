import { describe, expect, it } from "vitest";
import {
  parsePublicStoreSettings,
  storeSettingsSchema,
  storeSettingsUpdateSchema,
  toPublicStoreSettings,
} from "../settings/store-settings";
import { themeConfigSchema } from "../theme";
import { validSettings } from "./fixture";

const messagesOf = (input: unknown): string[] => {
  const result = storeSettingsSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("storeSettingsSchema", () => {
  it("accepts a complete payload and normalizes it", () => {
    const settings = storeSettingsSchema.parse(validSettings());
    expect(settings.contact.phone).toBe("+212612345678");
    expect(settings.contact.whatsapp).toBe("+212700000000");
    expect(settings.contact.country).toBe("MA");
    expect(settings.localization.defaultCurrency).toBe("MAD");
    expect(settings.billing.invoicePrefix).toBe("FAC");
    expect(settings.theme.overrides.light.primary).toBe("#E9B44C");
  });

  it("requires the default locale to be enabled", () => {
    const input = validSettings();
    input.localization.enabledLocales = ["fr", "en"];
    expect(messagesOf(input)).toContain("localization.defaultNotEnabled");
  });

  it("rejects duplicated locales", () => {
    const input = validSettings();
    input.localization.enabledLocales = ["ar", "ar"];
    expect(messagesOf(input)).toContain("localization.duplicate");
  });

  it("validates Moroccan legal identifiers", () => {
    const input = validSettings();
    input.billing.ice = "123";
    input.billing.rib = "12";
    expect(messagesOf(input)).toEqual(
      expect.arrayContaining(["billing.ice.invalid", "billing.rib.invalid"]),
    );
  });

  it("rejects an unknown time zone", () => {
    const input = validSettings();
    input.localization.timezone = "Mars/Olympus";
    expect(messagesOf(input)).toContain("timezone.invalid");
  });

  it("validates tracking ids but allows empty ones", () => {
    const input = validSettings();
    input.marketing.gtmId = "UA-123";
    expect(messagesOf(input)).toContain("tracking.invalid");
  });

  it("accepts relative and absolute announcement links", () => {
    const input = validSettings();
    input.marketing.announcementBar.href = "https://example.ma/promo";
    expect(messagesOf(input)).toEqual([]);
    input.marketing.announcementBar.href = "promo";
    expect(messagesOf(input)).toContain("href.invalid");
  });
});

describe("themeConfigSchema", () => {
  it("rejects short or named colors", () => {
    const input = validSettings().theme;
    expect(
      themeConfigSchema.safeParse({ ...input, overrides: { light: { bg: "#FFF" } } }).success,
    ).toBe(false);
    expect(
      themeConfigSchema.safeParse({ ...input, overrides: { light: { bg: "red" } } }).success,
    ).toBe(false);
  });

  it("defaults missing override maps", () => {
    const parsed = themeConfigSchema.parse({ ...validSettings().theme, overrides: {} });
    expect(parsed.overrides).toEqual({ light: {}, dark: {} });
  });
});

describe("public settings", () => {
  it("strips SMTP, bank details and the technical email domain", () => {
    const settings = storeSettingsSchema.parse(validSettings());
    const publicSettings = toPublicStoreSettings(settings);
    expect(publicSettings).not.toHaveProperty("smtp");
    expect(publicSettings.billing).not.toHaveProperty("rib");
    expect(publicSettings.billing).not.toHaveProperty("bankName");
    expect(publicSettings.commerce).not.toHaveProperty("technicalEmailDomain");
    expect(publicSettings.billing.ice).toBe("001234567000089");
  });

  it("round-trips through the public parser", () => {
    const publicSettings = toPublicStoreSettings(storeSettingsSchema.parse(validSettings()));
    const parsed = parsePublicStoreSettings(publicSettings);
    expect(parsed.ok).toBe(true);
  });

  it("reports invalid public payloads without throwing", () => {
    expect(parsePublicStoreSettings({ identity: {} }).ok).toBe(false);
  });
});

describe("storeSettingsUpdateSchema", () => {
  it("accepts a partial section", () => {
    const update = storeSettingsUpdateSchema.parse({ contact: { city: "Fès" } });
    expect(update).toEqual({ contact: { city: "Fès" } });
  });

  it("accepts a write-only SMTP password", () => {
    const update = storeSettingsUpdateSchema.parse({ smtp: { password: "secret" } });
    expect(update.smtp?.password).toBe("secret");
  });

  it("rejects unknown sections and read-only fields", () => {
    expect(storeSettingsUpdateSchema.safeParse({ unknown: {} }).success).toBe(false);
    expect(storeSettingsUpdateSchema.safeParse({ updatedAt: "2026-01-01T00:00:00Z" }).success).toBe(
      false,
    );
  });
});
