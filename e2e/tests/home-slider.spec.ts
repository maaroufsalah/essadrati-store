import { expect, type Locator, type Page, test } from "@playwright/test";
import ar from "../../apps/storefront/messages/ar.json" with { type: "json" };
import fr from "../../apps/storefront/messages/fr.json" with { type: "json" };

/**
 * Hero slider of the home page, against the seeded slides (three, all
 * active). Labels come from the storefront messages.
 */
type Messages = typeof fr;

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const goTo = (messages: Messages, index: number) =>
  messages.home.slider.goTo.replace("{index}", String(index));
const anyGoTo = (messages: Messages) =>
  new RegExp(`^${escape(messages.home.slider.goTo).replace(escape("{index}"), "(\\d+)")}$`);

function slider(page: Page, messages: Messages): Locator {
  return page.getByRole("region", { name: messages.home.slider.label });
}

/** Index (1-based) of the dot marked as current. */
async function currentSlide(region: Locator, messages: Messages): Promise<number> {
  const label = await region.locator("button[aria-current]").getAttribute("aria-label");
  return Number(anyGoTo(messages).exec(label ?? "")?.[1] ?? 0);
}

async function expectSlide(region: Locator, messages: Messages, index: number) {
  await expect.poll(() => currentSlide(region, messages)).toBe(index);
}

/** Touch swipe of `dx` pixels across the slider. */
async function swipe(region: Locator, dx: number) {
  await region.evaluate((node, distance) => {
    const init = { bubbles: true, pointerType: "touch", isPrimary: true, pointerId: 7 };
    node.dispatchEvent(new PointerEvent("pointerdown", { ...init, clientX: 200, clientY: 300 }));
    node.dispatchEvent(
      new PointerEvent("pointerup", { ...init, clientX: 200 + distance, clientY: 304 }),
    );
  }, dx);
}

test.describe("home slider", () => {
  test("shows the slides in order and moves both ways (fr, LTR)", async ({ page }) => {
    await page.goto("/fr");
    const region = slider(page, fr);
    await expect(region).toBeVisible();
    await expect(region.getByRole("button", { name: anyGoTo(fr) })).toHaveCount(3);
    await expectSlide(region, fr, 1);

    // Focus inside the slider pauses the autoplay for the rest of the test.
    await region.getByRole("button", { name: goTo(fr, 3) }).click();
    await expectSlide(region, fr, 3);

    // Wraps around; the right arrow key goes forward in LTR.
    await page.keyboard.press("ArrowRight");
    await expectSlide(region, fr, 1);
    await page.keyboard.press("ArrowLeft");
    await expectSlide(region, fr, 3);

    // Swiping to the left reveals the next slide.
    await swipe(region, -150);
    await expectSlide(region, fr, 1);
  });

  test("mirrors swipe and arrow keys in Arabic (RTL)", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const region = slider(page, ar);
    await expect(region).toBeVisible();
    await region.getByRole("button", { name: goTo(ar, 1) }).focus();
    await expectSlide(region, ar, 1);

    // Swiping to the right reveals the next slide in RTL.
    await swipe(region, 150);
    await expectSlide(region, ar, 2);
    await swipe(region, -150);
    await expectSlide(region, ar, 1);

    await page.keyboard.press("ArrowLeft");
    await expectSlide(region, ar, 2);
    await page.keyboard.press("ArrowRight");
    await expectSlide(region, ar, 1);
  });
});
