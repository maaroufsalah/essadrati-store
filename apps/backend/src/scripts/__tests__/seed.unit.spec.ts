import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { placeholderSceneSvg, placeholderSvg } from "../lib/placeholder";

describe("catalog seed data", () => {
  it("renders every placeholder shape as standalone SVG", () => {
    for (const shape of ["jar", "bottle", "box"] as const) {
      const svg = placeholderSvg({ shape, fill: "#C9861A", accent: "#7A4A0E" });
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain("#C9861A");
    }
  });

  it("gives every product a translation in each kit locale", () => {
    const catalog = JSON.parse(
      readFileSync(path.join(__dirname, "../../../data/seed/catalog.json"), "utf8"),
    ) as { products: { handle: string; title: Record<string, string> }[] };
    for (const product of catalog.products) {
      expect(Object.keys(product.title).sort(), product.handle).toEqual(["ar", "en", "fr"]);
    }
  });

  it("renders scenes at the requested size and translates every home text", () => {
    const svg = placeholderSceneSvg(
      { shape: "jar", fill: "#C9861A", accent: "#7A4A0E", from: "#3B2208", to: "#C9861A" },
      { width: 1920, height: 900 },
    );
    expect(svg).toContain('viewBox="0 0 1920 900"');
    const home = JSON.parse(
      readFileSync(path.join(__dirname, "../../../data/seed/home.json"), "utf8"),
    ) as { slides: { title: object }[]; banners: { title: object }[] };
    expect(home.slides).toHaveLength(3);
    expect(home.banners).toHaveLength(3);
    for (const item of [...home.slides, ...home.banners]) {
      expect(Object.keys(item.title).sort()).toEqual(["ar", "en", "fr"]);
    }
  });
});
