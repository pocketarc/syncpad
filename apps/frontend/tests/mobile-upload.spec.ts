import { expect, test } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Mobile File Upload", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/test-blue-cat-moon");
        // Wait for WebSocket connection
        await expect(page.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
    });

    test("should upload file via tap on mobile @mobile", async ({ page, isMobile }) => {
        test.skip(!isMobile, "Mobile-only test");

        const filePath = path.join(__dirname, "fixtures", "test.txt");

        // Tap the file drop zone
        const dropZone = page.locator('[aria-label="File drop zone"]');
        await dropZone.tap();

        // Set the file on the hidden input
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);

        // Wait for file to be processed
        await page.waitForTimeout(1000);

        // Verify the file upload was successful
        expect(await fileInput.inputValue()).toBe("");
    });

    test("should show proper mobile interface text @mobile", async ({ page, isMobile }) => {
        test.skip(!isMobile, "Mobile-only test");

        const instructionText = page.locator(
            "text=Tap here to select files, or drag and drop files here to sync them.",
        );
        await expect(instructionText).toBeVisible();
    });

    test("should handle touch events properly @mobile", async ({ page, isMobile }) => {
        test.skip(!isMobile, "Mobile-only test");

        const dropZone = page.locator('[aria-label="File drop zone"]');

        // Test touch start/end events
        await dropZone.dispatchEvent("touchstart");
        await dropZone.dispatchEvent("touchend");

        // Should still be clickable after touch events
        await expect(dropZone).toBeVisible();
        await expect(dropZone).toHaveClass(/cursor-pointer/);
    });

    test("should work on both mobile platforms", async ({ page, isMobile }) => {
        // This test runs on all browsers but focuses on mobile-like interactions
        const filePath = path.join(__dirname, "fixtures", "sample.json");

        const dropZone = page.locator('[aria-label="File drop zone"]');

        // Use tap for mobile, click for desktop
        if (isMobile) {
            await dropZone.tap();
        } else {
            await dropZone.click();
        }

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);

        await page.waitForTimeout(1000);

        // Verify file input was reset
        expect(await fileInput.inputValue()).toBe("");
    });

    test("should maintain responsive design on small screens", async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        const dropZone = page.locator('[aria-label="File drop zone"]');

        // Check that drop zone is properly sized for mobile
        const boundingBox = await dropZone.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(300); // Should take most of the screen width

        // Check that text is visible and readable
        const instructionText = page.locator("text=Tap here to select files");
        await expect(instructionText).toBeVisible();
    });
});
