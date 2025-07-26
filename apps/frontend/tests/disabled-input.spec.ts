import { expect, test } from "@playwright/test";

const ROOM_ID = "test-disabled-input-room";

// This URL will match the WebSocket connection initiated by the client.
const WEBSOCKET_URL_REGEX = /^ws:/;

let shouldCloseWebSocket = true;

test.describe("Disabled Input Functionality (with network interception)", () => {
    test("inputs are disabled during reconnection and re-enabled", async ({ page }) => {
        // Set up a route to intercept and forcefully close the next WebSocket connection.
        await page.routeWebSocket(WEBSOCKET_URL_REGEX, async (ws) => {
            // This will cause the client's `onclose` event to fire.
            if (shouldCloseWebSocket) {
                await ws.close();
            } else {
                const server = ws.connectToServer();
                ws.onMessage((message) => {
                    server.send(message);
                });
            }
        });

        // Do the initial page load.
        await page.goto(`/room#${ROOM_ID}`);
        const statusBar = page.locator('[data-testid="status-bar"]');

        const textarea = page.locator("textarea");
        const fileInput = page.locator('input[type="file"]');
        const dropZoneText = page.locator("text=File uploads disabled while connecting...");

        // Wait for the client's ping/pong timeout to detect the dead connection
        // and trigger the reconnection logic, which will then be intercepted.
        await expect(statusBar).toHaveText(/Reconnecting/);

        // Verify inputs are disabled while reconnecting.
        await expect(textarea).toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", "Connecting to server...");
        await expect(fileInput).toBeDisabled();
        await expect(dropZoneText).toBeVisible();

        // Remove the interception to allow the next reconnection attempt to succeed.
        shouldCloseWebSocket = false;

        // Wait for the status bar to show a successful connection again.
        await expect(statusBar).toHaveText("● Live sync active");

        // Verify inputs are enabled again.
        await expect(textarea).not.toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", /Type here/);
        const fileInputConnected = page.locator('input[type="file"]');
        await expect(fileInputConnected).not.toBeDisabled();
        const dropZoneTextConnected = page.locator("text=📁 Tap to select files or drag & drop to sync instantly");
        await expect(dropZoneTextConnected).toBeVisible();
    });

    test("inputs are properly enabled when connected from the start", async ({ page }) => {
        await page.goto(`/room#${ROOM_ID}-normal`);

        // Wait for successful connection.
        await expect(page.locator('[data-testid="status-bar"]')).toHaveText("● Live sync active", {
            timeout: 10000,
        });

        // Verify all inputs are enabled.
        const textarea = page.locator("textarea");
        await expect(textarea).not.toBeDisabled();
        await expect(textarea).toHaveAttribute("placeholder", /Type here/);

        const fileInput = page.locator('input[type="file"]');
        await expect(fileInput).not.toBeDisabled();

        // Verify styling is correct for enabled state.
        await expect(textarea).not.toHaveClass(/bg-stone-100/);
        await expect(textarea).not.toHaveClass(/cursor-not-allowed/);

        const dropZone = page.locator("fieldset");
        await expect(dropZone).not.toHaveClass(/cursor-not-allowed/);
        const button = page.locator('[aria-label="File drop zone"]');
        await expect(button).toHaveClass(/cursor-pointer/);
    });
});
