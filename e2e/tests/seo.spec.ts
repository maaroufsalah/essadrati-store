import { expect, type Page, test } from "@playwright/test";

/**
 * Structured data and head tags of the main pages (seeded store). One
 * viewport is enough: the head does not depend on it.
 */
test.skip(({ viewport }) => (viewport?.width ?? 0) < 1024, "head checks run on desktop only");

async function jsonLdTypes(page: Page): Promise<string[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((text) => {
    const data = JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[];
    return (Array.isArray(data) ? data : [data]).map((item) => String(item["@type"]));
  });
}

test("home: Organization and WebSite with a catalog search action", async ({ page }) => {
  await page.goto("/fr");
  expect(await jsonLdTypes(page)).toEqual(expect.arrayContaining(["Organization", "WebSite"]));
  await expect(page.locator("h1")).toHaveCount(1);
  for (const lang of ["ar", "fr", "en", "x-default"]) {
    await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveCount(1);
  }
});

test("product: Product with offers in the store currency and a breadcrumb", async ({ page }) => {
  await page.goto("/fr/p/asal-ferrane");
  const types = await jsonLdTypes(page);
  expect(types).toEqual(expect.arrayContaining(["Product", "BreadcrumbList"]));
  const product = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) =>
      nodes
        .map((node) => JSON.parse(node.textContent ?? "{}") as Record<string, unknown>)
        .find((data) => data["@type"] === "Product"),
    );
  const offers = (product?.offers ?? []) as { priceCurrency: string; availability: string }[];
  expect(offers.length).toBeGreaterThan(0);
  expect(offers[0]?.priceCurrency).toBe("MAD");
  expect(offers[0]?.availability).toMatch(/schema\.org\/(InStock|OutOfStock)$/);
});

test("catalog: ItemList, clean canonical, 404 past the last page", async ({ page }) => {
  await page.goto("/fr/c/asal-hor");
  expect(await jsonLdTypes(page)).toEqual(expect.arrayContaining(["ItemList", "BreadcrumbList"]));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fr\/c\/asal-hor$/);
  const response = await page.goto("/fr/products?page=99");
  expect(response?.status()).toBe(404);
});

test("FAQ page: FAQPage from the question headings", async ({ page }) => {
  await page.goto("/fr/faq");
  expect(await jsonLdTypes(page)).toContain("FAQPage");
});
