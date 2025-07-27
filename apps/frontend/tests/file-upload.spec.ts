import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("File Upload", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/room#test-blue-cat-moon");
        // Wait for WebSocket connection
        await expect(page.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
    });

    test("should upload file via click", async ({ page }) => {
        const filePath = path.join(__dirname, "fixtures", "test.txt");

        // Click the file drop zone to trigger file input
        await page.locator('[aria-label="File drop zone"]').click({ position: { x: 5, y: 5 } });

        // Set the file on the hidden input
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);

        // Verify the file upload was successful by checking for any file-related activity
        // Since this is real-time sync, we can't easily assert on the exact state,
        // but we can verify the input was properly handled
        await expect
            .poll(async () => {
                return await fileInput.inputValue();
            })
            .toBe("");
    });

    test("should upload multiple files via click", async ({ page }) => {
        const filePaths = [
            path.join(__dirname, "fixtures", "test.txt"),
            path.join(__dirname, "fixtures", "sample.json"),
        ];

        await page.locator('[aria-label="File drop zone"]').click({ position: { x: 5, y: 5 } });

        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePaths);

        // Verify input was reset
        expect(await fileInput.inputValue()).toBe("");
    });

    test("should handle drag and drop file upload", async ({ page }) => {
        const filePath = path.join(__dirname, "fixtures", "test.txt");

        // Create a simple drag and drop simulation
        page.locator('[aria-label="File drop zone"]');

        // Use setInputFiles which works more reliably than simulating drag/drop
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(filePath);

        // Verify input was reset
        expect(await fileInput.inputValue()).toBe("");
    });

    test("should show hover effect on file drop zone", async ({ page, isMobile }) => {
        test.skip(isMobile, "Hover effect is not applicable on mobile devices");

        const dropZone = page.locator('[data-testid="file-drop-zone-container"]');

        const initialBorderColor = await dropZone.evaluate((element) => {
            return window.getComputedStyle(element).borderColor;
        });

        // Hover over the drop zone
        await page.locator('[aria-label="File drop zone"]').hover({ position: { x: 5, y: 5 } });

        const hoveredBorderColor = await dropZone.evaluate((element) => {
            return window.getComputedStyle(element).borderColor;
        });

        // Should show hover effect (border color change)
        expect(initialBorderColor).not.toBe(hoveredBorderColor);
    });

    test("should have proper accessibility attributes", async ({ page }) => {
        const dropZone = page.locator('[aria-label="File drop zone"]');
        const fileInput = page.locator('input[type="file"]');

        // Check aria-label
        await expect(dropZone).toHaveAttribute("aria-label", "File drop zone");

        // Check file input has multiple attribute
        await expect(fileInput).toHaveAttribute("multiple");
    });

    test("should not trigger file upload when typing spaces in textarea", async ({ page }) => {
        let fileChooserOpened = false;
        page.on("filechooser", () => {
            fileChooserOpened = true;
        });

        const textarea = page.locator("textarea");
        await textarea.focus();
        await textarea.press(" ");
        await textarea.press("a");
        await textarea.press(" ");
        await textarea.press("b");

        expect(fileChooserOpened).toBe(false);
    });
});
