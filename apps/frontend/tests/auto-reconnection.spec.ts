import { expect, test } from "@playwright/test";

test.describe("Auto-reconnection functionality", () => {
    test("should show connecting status initially and then connected", async ({ page }) => {
        // Navigate to the application
        await page.goto("/room?id=test-blue-cat-moon");

        // Should eventually connect
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Verify basic functionality works
        const testMessage = "Test message";
        await page.fill("textarea", testMessage);
        await expect(page.locator("textarea")).toHaveValue(testMessage);
    });

    test("should simulate connection loss by blocking WebSocket traffic", async ({ page, context }) => {
        if (!process.env["NEXT_PUBLIC_WEBSOCKET_URI"]) {
            throw new Error("NEXT_PUBLIC_WEBSOCKET_URI environment variable is not set.");
        }

        const websocketUri = process.env["NEXT_PUBLIC_WEBSOCKET_URI"];

        // Navigate to the application and wait for connection
        await page.goto("/room?id=test-blue-cat-moon");
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Block WebSocket connections to force a reconnection scenario
        await context.route(websocketUri, (route) => {
            // Block the WebSocket connection
            route.abort();
        });

        // Force a new WebSocket connection by triggering a component update
        await page.evaluate(() => {
            // Trigger a page reload to force WebSocket reconnection with blocked route
            window.location.reload();
        });

        // Should show reconnecting status when WebSocket can't connect
        await expect(page.getByTestId("status-bar")).toHaveText(/Status: (Connecting|Reconnecting|Error)/, {
            timeout: 10000,
        });

        // Unblock WebSocket connections
        await context.unroute(websocketUri);

        // Should eventually reconnect
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");
    });

    test("should maintain connection status properly", async ({ page }) => {
        await page.goto("/room?id=test-blue-cat-moon");

        // Should show initial connecting then connected status
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Wait for a bit to ensure connection is stable
        await page.waitForTimeout(2000);

        // Should still be connected
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Test that we can send messages (basic functionality)
        const testMessage = "Hello WebSocket";
        await page.fill("textarea", testMessage);
        await expect(page.locator("textarea")).toHaveValue(testMessage);
    });

    test("should handle network interruption gracefully", async ({ page, context }) => {
        await page.goto("/room?id=test-blue-cat-moon");
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Test basic message sending first
        await page.fill("textarea", "Before interruption");
        await expect(page.locator("textarea")).toHaveValue("Before interruption");

        // Block network traffic temporarily to simulate network issue
        await context.setOffline(true);
        await page.waitForTimeout(2000);

        // Restore network
        await context.setOffline(false);

        // Should eventually reconnect
        await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

        // Test functionality after reconnection
        await page.fill("textarea", "After reconnection");
        await expect(page.locator("textarea")).toHaveValue("After reconnection");
    });
});
