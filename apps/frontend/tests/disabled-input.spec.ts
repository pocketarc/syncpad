import { expect, test } from "@playwright/test";

test.describe("Disabled Input Functionality", () => {
    test("inputs should be disabled initially while connecting", async ({ page, context }) => {
        await page.goto("/room?id=test-blue-cat-moon");
        
        // Wait for the page to load completely
        const statusBar = page.locator('[data-testid="status-bar"]');
        await expect(statusBar).toBeVisible();
        
        // Set offline mode AFTER page loads to prevent WebSocket connection
        await context.setOffline(true);

        // Check that inputs are disabled when connection fails
        const textarea = page.locator("textarea");

        // Verify inputs are disabled during connection failure
        await expect(textarea).toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", "Connecting to server...");

        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).toBeDisabled();

        const dropZoneText = page.locator("text=File uploads disabled while connecting...");
        await expect(dropZoneText).toBeVisible();

        // Re-enable network to test successful connection
        await context.setOffline(false);

        // Then wait for successful connection and verify inputs are enabled
        await page.waitForSelector('[data-testid="status-bar"]:has-text("Live sync active")', { timeout: 10000 });

        await expect(textarea).not.toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", /Type here/);

        const fileInputConnected = page.locator('input[type="file"]');
        await expect(fileInputConnected).not.toBeDisabled();

        const dropZoneTextConnected = page.locator("text=📁 Tap to select files or drag & drop to sync instantly");
        await expect(dropZoneTextConnected).toBeVisible();
    });

    test("inputs are properly enabled when connected", async ({ page }) => {
        await page.goto("/room?id=test-blue-cat-moon");

        // Wait for successful connection
        await page.waitForSelector('[data-testid="status-bar"]:has-text("Live sync active")', { timeout: 10000 });

        // Verify all inputs are enabled
        const textarea = page.locator("textarea");
        await expect(textarea).not.toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", /Type here/);

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
