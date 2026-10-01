import { describe, expect, it } from "vitest";
import { redirectForDisabledLocale, routingFromSettings } from "./locale";

describe("routingFromSettings", () => {
  it("keeps the kit order and the configured default", () => {
    const routing = routingFromSettings({
      localization: {
        defaultLocale: "fr",
        enabledLocales: ["en", "fr"],
        defaultCurrency: "MAD",
        timezone: "Africa/Casablanca",
        numberingSystem: "latn",
      },
    });
    expect(routing).toEqual({ locales: ["fr", "en"], defaultLocale: "fr" });
  });
});

describe("redirectForDisabledLocale", () => {
  const routing = { locales: ["ar" as const, "fr" as const], defaultLocale: "ar" as const };

  it("redirects a disabled locale to the default one, keeping the path", () => {
    expect(redirectForDisabledLocale("/en/c/honey", routing)).toBe("/ar/c/honey");
    expect(redirectForDisabledLocale("/en", routing)).toBe("/ar");
  });

  it("leaves enabled locales and other paths alone", () => {
    expect(redirectForDisabledLocale("/fr/c/honey", routing)).toBeNull();
    expect(redirectForDisabledLocale("/c/honey", routing)).toBeNull();
    expect(redirectForDisabledLocale("/", routing)).toBeNull();
  });
});
