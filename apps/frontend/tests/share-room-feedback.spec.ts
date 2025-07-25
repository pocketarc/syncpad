import { expect, test } from "@playwright/test";

test.describe("Share Room Button Feedback", () => {
    test("shows feedback when copying room URL", async ({ page }) => {
        // Mock the clipboard API to control its behavior in the test
        await page.addInitScript(() => {
            let clipboardText = "";
            Object.defineProperty(navigator, "clipboard", {
                value: {
                    writeText: async (text: string) => {
                        clipboardText = text;
                        return Promise.resolve();
                    },
                    readText: async () => Promise.resolve(clipboardText),
                },
                configurable: true,
            });
        });

        // Visit a test room
        await page.goto("/room#test-blue-cat-moon");

        // Wait for the page to load and WebSocket to connect
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Find the share room button using the name attribute
        const shareButton = page.locator('button[name="share-room-button"]');
        await expect(shareButton).toBeVisible();
        await expect(shareButton).toContainText("📋 Share Room");

        // Click the share button
        await shareButton.click();

        // Check that button shows "Copied!" feedback
        await expect(shareButton).toContainText("✅ Copied!");
        await expect(shareButton).toBeDisabled();

        // Verify the URL was "copied" to our mock clipboard
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toContain("/room#test-blue-cat-moon");

        // Wait for button to return to original state (2 second timeout)
        await expect(shareButton).toContainText("📋 Share Room", { timeout: 3000 });
        await expect(shareButton).toBeEnabled();
    });

    test("shows error feedback when clipboard fails", async ({ page, browserName }) => {
        // Only run clipboard error test on Chromium for now due to permission issues on other browsers
        if (browserName !== "chromium") {
            test.skip();
        }

        // Visit a test room
        await page.goto("/room#test-blue-cat-moon");

        // Wait for the page to load and WebSocket to connect
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Mock clipboard to throw an error
        await page.addInitScript(() => {
            Object.defineProperty(navigator, "clipboard", {
                value: {
                    writeText: () => Promise.reject(new Error("Clipboard access denied")),
                },
            });
        });

        // Find the share room button using the name attribute
        const shareButton = page.locator('button[name="share-room-button"]');
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
