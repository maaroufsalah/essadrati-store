import { describe, expect, it } from "vitest";
import {
  directionOf,
  fromMedusaLocale,
  isLocale,
  resolveLocalized,
  toMedusaLocale,
} from "../locale";

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

describe("medusa locales", () => {
  it("derives BCP 47 tags from the store country", () => {
    expect(toMedusaLocale("ar", "ma")).toBe("ar-MA");
    expect(toMedusaLocale("fr", "MA")).toBe("fr-MA");
  });

  it("maps Medusa tags back to kit locales", () => {
    expect(fromMedusaLocale("fr-MA")).toBe("fr");
    expect(fromMedusaLocale("EN-us")).toBe("en");
    expect(fromMedusaLocale("de-DE")).toBeNull();
  });
});
