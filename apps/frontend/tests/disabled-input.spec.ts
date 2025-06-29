import { expect, test } from "@playwright/test";

test.describe("Disabled Input Functionality", () => {
    test("inputs should be disabled initially while connecting", async ({ page }) => {
        await page.goto("http://localhost:3050/test-blue-cat-moon");

        // Immediately check if inputs are disabled during the initial connection phase
        const textarea = page.locator("textarea");
        const statusBar = page.locator('[data-testid="status-bar"]');

        // Wait for the status bar to appear
        await expect(statusBar).toBeVisible();

        // Check the initial state - should show "Connecting" or another non-"Connected" state
        const initialStatus = await statusBar.textContent();

        if (initialStatus && !initialStatus.includes("Live sync active")) {
            // If we catch it in a non-connected state, verify inputs are disabled
            await expect(textarea).toBeDisabled();
            await expect(textarea).toHaveAttribute("placeholder", "Connecting to server...");

            const fileInput = page.locator('input[type="file"]');
            await expect(fileInput).toBeDisabled();

            const dropZoneText = page.locator("text=File uploads disabled while connecting...");
            await expect(dropZoneText).toBeVisible();
        }

        // Then wait for successful connection and verify inputs are enabled
        await page.waitForSelector('[data-testid="status-bar"]:has-text("Live sync active")', { timeout: 10000 });

        await expect(textarea).not.toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", "Paste stuff here or drop files in the box...");

        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).not.toBeDisabled();

        const dropZoneText = page.locator("text=Tap here to select files, or drag and drop files here to sync them.");
        await expect(dropZoneText).toBeVisible();
    });

    test("inputs are properly enabled when connected", async ({ page }) => {
        await page.goto("http://localhost:3050/test-blue-cat-moon");

        // Wait for successful connection
        await page.waitForSelector('[data-testid="status-bar"]:has-text("Live sync active")', { timeout: 10000 });

        // Verify all inputs are enabled
        const textarea = page.locator("textarea");
        await expect(textarea).not.toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", "Paste stuff here or drop files in the box...");

        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).not.toBeDisabled();

        // Verify styling is correct for enabled state
        await expect(textarea).not.toHaveClass(/bg-stone-100/);
        await expect(textarea).not.toHaveClass(/cursor-not-allowed/);

        const dropZone = page.locator('[aria-label="File drop zone"]');
        await expect(dropZone).toHaveClass(/cursor-pointer/);
        await expect(dropZone).not.toHaveClass(/cursor-not-allowed/);
    });
});
