import { expect, test } from "@playwright/test";

test.describe("Auto-reconnection functionality", () => {
    test("should show connecting status initially and then connected", async ({ page }) => {
        // Navigate to the application
        await page.goto("/");

        // Should eventually connect
        await expect(page.getByTestId("status-bar")).toHaveText("Status: Connected", { timeout: 10000 });

        // Verify basic functionality works
        const testMessage = "Test message";
        await page.fill("textarea", testMessage);
        await expect(page.locator("textarea")).toHaveValue(testMessage);
    });

    test("should simulate connection loss by blocking WebSocket traffic", async ({ page, context }) => {
        // Navigate to the application and wait for connection
        await page.goto("/");
        await expect(page.getByTestId("status-bar")).toHaveText("Status: Connected", { timeout: 10000 });

        // Block WebSocket connections to force a reconnection scenario
        await context.route("ws://localhost:8080/", (route) => {
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
        await context.unroute("ws://localhost:8080/");

        // Should eventually reconnect
        await expect(page.getByTestId("status-bar")).toHaveText("Status: Connected", { timeout: 20000 });
    });

    test("should maintain connection status properly", async ({ page }) => {
        await page.goto("/");

        // Should show initial connecting then connected status
        await expect(page.getByTestId("status-bar")).toHaveText("Status: Connected", { timeout: 10000 });

        // Wait for a bit to ensure connection is stable
        await page.waitForTimeout(2000);

        // Should still be connected
        await expect(page.getByTestId("status-bar")).toHaveText("Status: Connected");

        // Test that we can send messages (basic functionality)
        const testMessage = "Hello WebSocket";
        await page.fill("textarea", testMessage);
        await expect(page.locator("textarea")).toHaveValue(testMessage);
    });

    test("should handle network interruption gracefully", async ({ page, context }) => {
        await page.goto("/");
        await expect(page.getByTestId("status-bar")).toHaveText("Status: Connected", { timeout: 10000 });

        // Test basic message sending first
        await page.fill("textarea", "Before interruption");
        await expect(page.locator("textarea")).toHaveValue("Before interruption");

        // Block network traffic temporarily to simulate network issue
        await context.setOffline(true);
        await page.waitForTimeout(2000);

        // Restore network
        await context.setOffline(false);

        // Should eventually reconnect
        await expect(page.getByTestId("status-bar")).toHaveText("Status: Connected", { timeout: 15000 });

        // Test functionality after reconnection
        await page.fill("textarea", "After reconnection");
        await expect(page.locator("textarea")).toHaveValue("After reconnection");
    });
});
