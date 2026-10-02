import { expect, type Locator, type Page, test } from "@playwright/test";
import fr from "../../apps/storefront/messages/fr.json" with { type: "json" };

/**
 * Catalog filters against the seeded catalog: weight facet "poids"
 * (500g, 1kg...), price range, sort and URL state. Phones and tablets use
 * the full-screen filter sheet, desktops the sidebar.
 */
/** "Filtrer" from "{count, plural, =0 {Filtrer} other {…}}": the button name starts with it. */
const filterLabel = new RegExp(`^${/=0 \{([^}]+)\}/.exec(fr.category.filterButton)?.[1] ?? "-"}`);

/** The filters container: the sidebar on desktop, the sheet otherwise. */
async function filters(page: Page): Promise<Locator> {
  const sidebar = page.getByRole("complementary", { name: fr.category.filters });
  if (await sidebar.isVisible()) return sidebar;
  await page.getByRole("button", { name: filterLabel }).click();
  return page.getByRole("dialog");
}

async function closeFilters(page: Page) {
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) await page.keyboard.press("Escape");
}

test.describe("catalog filters", () => {
  test("a weight filter narrows the results and shows a removable chip", async ({ page }) => {
    await page.goto("/fr/products");
    const panel = await filters(page);
    await panel.getByRole("checkbox", { name: /^1kg/ }).check({ force: true });
    await expect(page).toHaveURL(/[?&]poids=1kg(&|$)/);
    await closeFilters(page);

    const chips = page.getByRole("group", { name: fr.category.activeFilters });
    const chip = chips.getByRole("button", {
      name: fr.category.removeFilter.replace("{label}", "1kg"),
    });
    await expect(chip).toBeVisible();

    await chip.click();
    await expect(page).toHaveURL(/\/fr\/products$/);
    await expect(chips).toHaveCount(0);
  });

  test("a filtered URL is noindex with a canonical without filters", async ({ page }) => {
    // What crawlers get: the server HTML of a direct load.
    await page.goto("/fr/products?poids=1kg&sort=price_asc");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/fr\/products$/);
  });

  test("the price fields set the range in the URL and clear all resets it", async ({ page }) => {
    await page.goto("/fr/products");
    const panel = await filters(page);
    const max = panel.getByLabel(`${fr.category.max} (MAD)`);
    await max.fill("200");
    await max.press("Enter");
    await expect(page).toHaveURL(/[?&]max=200(&|$)/);
    await closeFilters(page);

    await page
      .getByRole("group", { name: fr.category.activeFilters })
      .getByRole("button", { name: fr.category.clearAll })
      .click();
    await expect(page).toHaveURL(/\/fr\/products$/);
  });

  test("a shared URL restores filters and sort on a category page", async ({ page }) => {
    await page.goto("/fr/c/asal-hor?poids=500g&sort=price_asc");
    await expect(
      page.getByLabel(fr.category.sort).or(page.locator("select[name=sort]")),
    ).toHaveValue("price_asc");
    const panel = await filters(page);
    await expect(panel.getByRole("checkbox", { name: /^500g/ })).toBeChecked();
    // A category page has no category facet.
    await expect(panel.getByRole("group", { name: fr.category.facetCategory })).toHaveCount(0);
  });
});
