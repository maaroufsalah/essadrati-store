import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { placeholderSvg } from "../lib/placeholder";

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
});
