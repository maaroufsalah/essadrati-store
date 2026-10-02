import { expect, test } from "@playwright/test";
import fr from "../../apps/storefront/messages/fr.json" with { type: "json" };

/** Product card quick view on the all products page (seeded catalog). */
test("quick view opens from a card, adds the chosen weight and closes", async ({ page }) => {
  await page.goto("/fr/products");
  const quickView = page.getByRole("button", {
    name: new RegExp(`^${fr.product.quickView.split("{")[0]}`),
  });
  await quickView.first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toBeVisible();
  await expect(dialog.getByRole("link", { name: fr.product.fullDetails })).toBeVisible();

  // Escape closes it and gives the focus back to the card button.
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(quickView.first()).toBeFocused();

  await quickView.first().click();
  await dialog.getByRole("button", { name: fr.cart.add }).click();
  // Success closes the quick view and opens the cart drawer.
  await expect(page.getByRole("dialog").getByRole("heading", { name: /Panier/ })).toBeVisible();
});
