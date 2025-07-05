import { expect, test } from "@playwright/test";

test.describe("Share Room Button Feedback", () => {
    test("shows feedback when copying room URL", async ({ page, context }) => {
        // Grant clipboard permissions
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);

        // Visit a test room
        await page.goto("/room?id=test-blue-cat-moon");

        // Wait for the page to load and WebSocket to connect
        await expect(page.getByTestId("status-bar")).toContainText("Connected");

        // Find the share room button
        const shareButton = page.getByRole("button", { name: /share room/i });
        await expect(shareButton).toBeVisible();
        await expect(shareButton).toContainText("📋 Share Room");

        // Click the share button
        await shareButton.click();

        // Check that button shows "Copied!" feedback
        await expect(shareButton).toContainText("✅ Copied!");
        await expect(shareButton).toBeDisabled();

        // Verify the URL was actually copied to clipboard
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toContain("/room?id=test-blue-cat-moon");

        // Wait for button to return to original state (2 second timeout)
        await expect(shareButton).toContainText("📋 Share Room", { timeout: 3000 });
        await expect(shareButton).toBeEnabled();
    });

    test("shows error feedback when clipboard fails", async ({ page }) => {
        // Visit a test room
        await page.goto("/room?id=test-blue-cat-moon");

        // Wait for the page to load and WebSocket to connect
        await expect(page.getByTestId("status-bar")).toContainText("Connected");

        // Mock clipboard to throw an error
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "clipboard", {
                value: {
                    writeText: () => Promise.reject(new Error("Clipboard access denied")),
                },
            });
        });

        // Find the share room button
        const shareButton = page.getByRole("button", { name: /share room/i });
        await expect(shareButton).toBeVisible();

        // Click the share button
        await shareButton.click();

        // Check that button shows "Failed" feedback
        await expect(shareButton).toContainText("❌ Failed");
        await expect(shareButton).toBeDisabled();

        // Wait for button to return to original state
        await expect(shareButton).toContainText("📋 Share Room", { timeout: 3000 });
        await expect(shareButton).toBeEnabled();
    });
});
