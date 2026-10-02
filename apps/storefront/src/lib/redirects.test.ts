import { describe, expect, it } from "vitest";
import { redirectTarget } from "./redirects";

const map = new Map([
  ["/p/old", "/p/new"],
  ["/c/عسل", "/c/asal-hor"],
  ["/ancienne-page", "/notre-histoire"],
]);

describe("redirects", () => {
  it("keeps the locale and redirects products, categories and pages", () => {
    expect(redirectTarget("/fr/p/old", map)).toBe("/fr/p/new");
    expect(redirectTarget("/ar/c/%D8%B9%D8%B3%D9%84", map)).toBe("/ar/c/asal-hor");
    expect(redirectTarget("/en/ancienne-page/", map)).toBe("/en/notre-histoire");
  });

  it("leaves other paths alone", () => {
    expect(redirectTarget("/fr/p/new", map)).toBeNull();
    expect(redirectTarget("/fr", map)).toBeNull();
    expect(redirectTarget("/fr/p/old/extra", map)).toBeNull();
    expect(redirectTarget("/fr/p/%E0%A4%A", map)).toBeNull();
  });
});
