import { DEFAULT_STORE_SETTINGS } from "@nocido/theme/defaults";
import { toPublicStoreSettings } from "@nocido/types";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "../lib/crypto";
import { applyUpdate, hydrateSettings, ThemeContrastError, toStoredData } from "../lib/settings";

const NOW = new Date("2026-10-01T12:00:00.000Z");

describe("hydrateSettings", () => {
  it("returns the kit defaults when nothing is stored", () => {
    const { settings, issues } = hydrateSettings(undefined, false);
    expect(settings).toEqual(DEFAULT_STORE_SETTINGS);
    expect(issues).toEqual([]);
  });

  it("fills fields added to the schema after the data was stored", () => {
    const { settings } = hydrateSettings({ commerce: { returnDays: 14 } }, false);
    expect(settings.commerce.returnDays).toBe(14);
    expect(settings.commerce.codEnabled).toBe(DEFAULT_STORE_SETTINGS.commerce.codEnabled);
  });

  it("resets only the invalid section and reports it", () => {
    const { settings, issues } = hydrateSettings(
      { contact: { phone: "not a phone" }, billing: { legalName: "Example SARL" } },
      false,
    );
    expect(settings.contact).toEqual(DEFAULT_STORE_SETTINGS.contact);
    expect(settings.billing.legalName).toBe("Example SARL");
    expect(issues.map((issue) => issue.section)).toEqual(["contact"]);
  });

  it("resets localization when cross-section rules fail", () => {
    const { settings, issues } = hydrateSettings(
      { localization: { defaultLocale: "en", enabledLocales: ["ar", "fr"] } },
      false,
    );
    expect(settings.localization).toEqual(DEFAULT_STORE_SETTINGS.localization);
    expect(issues.map((issue) => issue.section)).toEqual(["localization-rules"]);
  });

  it("derives passwordSet from the encrypted column, not from the JSON", () => {
    const stored = { smtp: { ...DEFAULT_STORE_SETTINGS.smtp, passwordSet: true } };
    expect(hydrateSettings(stored, false).settings.smtp.passwordSet).toBe(false);
    expect(hydrateSettings({}, true).settings.smtp.passwordSet).toBe(true);
  });
});

describe("applyUpdate", () => {
  it("merges sections shallowly and stamps updatedAt", () => {
    const { settings } = applyUpdate(
      DEFAULT_STORE_SETTINGS,
      { identity: { storeName: { fr: "Nouvelle boutique" } }, commerce: { returnDays: 10 } },
      NOW,
    );
    expect(settings.identity.storeName).toEqual({ fr: "Nouvelle boutique" });
    expect(settings.identity.tagline).toEqual(DEFAULT_STORE_SETTINGS.identity.tagline);
    expect(settings.commerce.returnDays).toBe(10);
    expect(settings.updatedAt).toBe(NOW.toISOString());
  });

  it("merges contact socials one level deeper", () => {
    const current = applyUpdate(
      DEFAULT_STORE_SETTINGS,
      { contact: { socials: { instagram: "https://instagram.com/example" } } },
      NOW,
    ).settings;
    const { settings } = applyUpdate(
      current,
      { contact: { socials: { facebook: "https://facebook.com/example" }, city: "Rabat" } },
      NOW,
    );
    expect(settings.contact.socials.instagram).toBe("https://instagram.com/example");
    expect(settings.contact.socials.facebook).toBe("https://facebook.com/example");
    expect(settings.contact.city).toBe("Rabat");
  });

  it("keeps, sets and clears the SMTP password", () => {
    expect(
      applyUpdate(DEFAULT_STORE_SETTINGS, { smtp: { host: "smtp.test" } }, NOW).password,
    ).toEqual({
      action: "keep",
    });

    const set = applyUpdate(DEFAULT_STORE_SETTINGS, { smtp: { password: "s3cret" } }, NOW);
    expect(set.password).toEqual({ action: "set", value: "s3cret" });
    expect(set.settings.smtp.passwordSet).toBe(true);
    expect(JSON.stringify(set.settings)).not.toContain("s3cret");

    const cleared = applyUpdate(set.settings, { smtp: { password: null } }, NOW);
    expect(cleared.password).toEqual({ action: "clear" });
    expect(cleared.settings.smtp.passwordSet).toBe(false);
  });

  it("rejects a merged result that breaks cross-section rules", () => {
    expect(() =>
      applyUpdate(DEFAULT_STORE_SETTINGS, { localization: { enabledLocales: ["fr"] } }, NOW),
    ).toThrowError(/localization.defaultNotEnabled/);
  });

  it("rejects a theme that fails WCAG contrast", () => {
    const update = () =>
      applyUpdate(
        DEFAULT_STORE_SETTINGS,
        {
          theme: {
            overrides: { light: { fg: "#FFFFFF", bg: "#FFFFFF" }, dark: {} },
          },
        },
        NOW,
      );
    expect(update).toThrowError(ThemeContrastError);
  });
});

describe("toStoredData", () => {
  it("does not persist the derived passwordSet flag", () => {
    const stored = toStoredData({
      ...DEFAULT_STORE_SETTINGS,
      smtp: { ...DEFAULT_STORE_SETTINGS.smtp, passwordSet: true },
    });
    expect(stored.smtp).not.toHaveProperty("passwordSet");
  });

  it("round-trips through hydrateSettings", () => {
    const { settings } = applyUpdate(
      DEFAULT_STORE_SETTINGS,
      { seo: { metaTitle: { ar: "عنوان" } } },
      NOW,
    );
    expect(hydrateSettings(toStoredData(settings), false).settings).toEqual(settings);
  });

  it("public settings never contain SMTP or bank details", () => {
    const publicSettings = toPublicStoreSettings(DEFAULT_STORE_SETTINGS);
    expect(publicSettings).not.toHaveProperty("smtp");
    expect(publicSettings.billing).not.toHaveProperty("rib");
  });
});

describe("secret encryption", () => {
  const key = "a-long-random-test-key-0123456789";

  it("round-trips and uses a fresh IV each time", () => {
    const first = encryptSecret("p@ss", key);
    const second = encryptSecret("p@ss", key);
    expect(first).not.toBe(second);
    expect(first.startsWith("v1.")).toBe(true);
    expect(decryptSecret(first, key)).toBe("p@ss");
  });

  it("fails with the wrong key or a tampered payload", () => {
    const payload = encryptSecret("p@ss", key);
    expect(() => decryptSecret(payload, "another-long-random-key-987654")).toThrow();
    expect(() => decryptSecret(`${payload.slice(0, -2)}AA`, key)).toThrow();
  });

  it("refuses a short key", () => {
    expect(() => encryptSecret("p@ss", "short")).toThrow(/at least 16/);
  });
});
