import { describe, expect, it } from "vitest";
import { directionOf, isLocale, resolveLocalized } from "../locale";

describe("resolveLocalized", () => {
  const value = { ar: "عسل", fr: "Miel" };

  it("returns the requested locale", () => {
    expect(resolveLocalized(value, "fr")).toBe("Miel");
  });

  it("uses fallbacks in order", () => {
    expect(resolveLocalized(value, "en", ["fr", "ar"])).toBe("Miel");
  });

  it("falls back to the first non-empty entry", () => {
    expect(resolveLocalized({ fr: "", en: "Honey" }, "ar")).toBe("Honey");
  });

  it("returns an empty string when nothing is set", () => {
    expect(resolveLocalized(undefined, "ar")).toBe("");
    expect(resolveLocalized({}, "ar")).toBe("");
  });
});

describe("locale helpers", () => {
  it("knows the direction of each locale", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("fr")).toBe("ltr");
    expect(directionOf("en")).toBe("ltr");
  });

  it("guards unknown locales", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("es")).toBe(false);
    expect(isLocale(42)).toBe(false);
  });
});
