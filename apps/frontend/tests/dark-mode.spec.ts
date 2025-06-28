import { expect, test } from "@playwright/test";

test.describe("Dark Mode Toggle", () => {
    test("should toggle between light and dark modes", async ({ page }) => {
        await page.goto("/");

        // Wait for the page to load completely
        await page.waitForSelector('[aria-label*="Switch to"]');

        // Check initial state - should be light mode by default
        const html = page.locator("html");
        const initialHasDark = await html.evaluate((el) => el.classList.contains("dark"));

        // Find the toggle button
        const toggleButton = page.locator('[aria-label*="Switch to"]');
        const initialAriaLabel = await toggleButton.getAttribute("aria-label");

        console.log("Initial dark class:", initialHasDark);
        console.log("Initial aria-label:", initialAriaLabel);

        // Click the toggle button
        await toggleButton.click();

        // Wait a bit for the toggle to take effect
        await page.waitForTimeout(100);

        // Check if the class was toggled
        const afterToggleHasDark = await html.evaluate((el) => el.classList.contains("dark"));
        const afterToggleAriaLabel = await toggleButton.getAttribute("aria-label");

        console.log("After toggle dark class:", afterToggleHasDark);
        console.log("After toggle aria-label:", afterToggleAriaLabel);

        // The dark class should be opposite of initial state
        expect(afterToggleHasDark).toBe(!initialHasDark);

        // The aria-label should have changed
        expect(afterToggleAriaLabel).not.toBe(initialAriaLabel);

        // Click again to toggle back
        await toggleButton.click();
        await page.waitForTimeout(100);

        const finalHasDark = await html.evaluate((el) => el.classList.contains("dark"));
        expect(finalHasDark).toBe(initialHasDark);
    });

    test("should persist theme choice in localStorage", async ({ page }) => {
        await page.goto("/");

        // Wait for the toggle button
        await page.waitForSelector('[aria-label*="Switch to"]');

        const toggleButton = page.locator('[aria-label*="Switch to"]');

        // Click to enable dark mode
        await toggleButton.click();
        await page.waitForTimeout(100);

        // Check if localStorage was updated
        const themeValue = await page.evaluate(() => localStorage.getItem("theme"));
        console.log("Theme in localStorage:", themeValue);

        // Reload the page to test persistence
        await page.reload();
        await page.waitForSelector('[aria-label*="Switch to"]');

        // Check if dark mode is still active after reload
        const html = page.locator("html");
        const hasDarkAfterReload = await html.evaluate((el) => el.classList.contains("dark"));

        console.log("Has dark class after reload:", hasDarkAfterReload);

        // Should maintain dark mode after reload
        expect(hasDarkAfterReload).toBe(true);
    });
});
