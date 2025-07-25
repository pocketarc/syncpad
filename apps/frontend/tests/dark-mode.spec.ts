import { expect, test } from "@playwright/test";

test.describe("Dark Mode Toggle", () => {
    test("should toggle between light and dark modes", async ({ page }) => {
        await page.goto("/room#test-dark-mode");

        // Wait for the page to load completely.
        await page.waitForSelector('[aria-label*="Switch to"]');

        // Check initial state.
        const html = page.locator("html");
        const initialHasDark = await html.evaluate((el) => el.classList.contains("dark"));

        // Find the toggle button.
        const toggleButton = page.locator('[aria-label*="Switch to"]');
        const initialAriaLabel = await toggleButton.getAttribute("aria-label");

        // Click the toggle button.
        await toggleButton.click();

        // Check if the class was toggled.
        await expect
            .poll(async () => page.locator("html").evaluate((el) => el.classList.contains("dark")))
            .toBe(!initialHasDark);

        // The aria-label should have changed.
        const afterToggleAriaLabel = await toggleButton.getAttribute("aria-label");
        expect(afterToggleAriaLabel).not.toBe(initialAriaLabel);

        // Click again to toggle back
        await toggleButton.click();

        // Check if the class was toggled back.
        await expect
            .poll(async () => page.locator("html").evaluate((el) => el.classList.contains("dark")))
            .toBe(initialHasDark);
    });

    test("should persist theme choice in localStorage", async ({ page }) => {
        await page.goto("/room#test-dark-mode");

        // Wait for the toggle button
        await page.waitForSelector('[aria-label*="Switch to"]');

        const toggleButton = page.locator('[aria-label*="Switch to"]');

        // Click to enable dark mode
        await toggleButton.click();

        // Check if localStorage was updated
        await expect.poll(async () => page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

        // Reload the page to test persistence
        await page.reload();

        // Should maintain dark mode after reload
        await expect.poll(async () => page.locator("html").evaluate((el) => el.classList.contains("dark"))).toBe(true);
    });
});
