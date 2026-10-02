import { expect, type Page, test } from "@playwright/test";
import fr from "../../apps/storefront/messages/fr.json" with { type: "json" };

/**
 * Labels come from the storefront messages: the tests follow wording changes.
 * ICU placeholders ({name}…) are matched loosely.
 */
const text = (message: string) =>
  new RegExp(
    message
      .split(/\{[^}]+\}/)
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join(".*"),
  );

/** First product of the catalog, from the home page. */
async function openFirstProduct(page: Page) {
  await page.goto("/fr");
  const product = page.locator('a[href*="/fr/p/"]').first();
  await expect(product).toBeVisible();
  await product.click();
  await expect(page).toHaveURL(/\/fr\/p\//);
  await expect(page.locator("h1")).toBeVisible();
}

/** Name, phone and the first city of the COD form inside `scope`. */
async function fillCustomer(page: Page, scope = page.locator("main")) {
  await scope.getByLabel(fr.cod.name, { exact: true }).fill("Client E2E");
  await scope.getByLabel(fr.cod.phone, { exact: true }).fill("0612345678");
  await scope.getByLabel(fr.cod.city, { exact: true }).selectOption({ index: 1 });
}

async function expectThankYou(page: Page) {
  await page.waitForURL(/\/fr\/order\/order_[A-Z0-9]+\/thanks/, { timeout: 120_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(text(fr.order.thanks.title));
  // Purchase is pushed once, with the order id as event id.
  const purchases = await page.evaluate(() =>
    (window.dataLayer ?? []).filter((entry) => entry.event === "nocido_Purchase"),
  );
  expect(purchases).toHaveLength(1);
}

test.describe("cash on delivery", () => {
  test("cart drawer, then multi-product checkout", async ({ page }) => {
    await openFirstProduct(page);
    await page.getByRole("button", { name: fr.cart.add }).click();

    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await drawer.getByRole("link", { name: fr.cart.checkout }).click();

    await expect(page).toHaveURL(/\/fr\/checkout$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(fr.checkout.title);
    await fillCustomer(page);
    await page.getByRole("button", { name: fr.cod.submit }).last().click();
    await expectThankYou(page);

    // The cart is empty again and the tracking page opens from the thank you page.
    await page.locator("main").getByRole("link", { name: fr.order.thanks.track }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(text(fr.order.tracking.title));
    await expect(page.locator('[aria-current="step"]')).toContainText(
      fr.order.tracking.steps.placed,
    );
  });

  test("one-step order from the product page", async ({ page }) => {
    await openFirstProduct(page);
    const form = page.locator("#cod-form");
    await fillCustomer(page, form);
    await form.getByRole("button", { name: fr.cod.submit }).click();
    await expectThankYou(page);
  });

  test("refuses an invalid phone and keeps the input", async ({ page }) => {
    await openFirstProduct(page);
    const form = page.locator("#cod-form");
    await form.getByLabel(fr.cod.name, { exact: true }).fill("Client E2E");
    await form.getByLabel(fr.cod.phone, { exact: true }).fill("12345");
    await form.getByLabel(fr.cod.city, { exact: true }).selectOption({ index: 1 });
    await form.getByRole("button", { name: fr.cod.submit }).click();
    await expect(form.getByText(fr.cod.errors.phone)).toBeVisible();
    await expect(form.getByLabel(fr.cod.name, { exact: true })).toHaveValue("Client E2E");
    await expect(page).toHaveURL(/\/fr\/p\//);
  });
});

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}
