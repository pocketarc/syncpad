import { expect, test } from "@playwright/test";
import { WebsocketController } from "./helpers/WebsocketController.ts";

test.describe("Participant List Functionality", () => {
    test("should show participant list when connected", async ({ page, browserName }, testInfo) => {
        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate to the room
        await page.goto(`/room?id=${roomId}`);

        // Wait for connection
        await expect(page.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Participant list should be visible
        await expect(page.locator('[data-testid="participant-list"]')).toBeVisible();

        // Should show "1 participant"
        await expect(page.locator('[data-testid="participant-list"]')).toContainText("1 participant");
    });

    test("should hide participant list when disconnected", async ({ page, browserName }, testInfo) => {
        const controller = await WebsocketController.interceptWebSocket(page);

        // Block WebSocket connections to simulate disconnection.
        await controller.block();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate to the application and wait for connection
        await page.goto(`/room?id=${roomId}`);

        // During reconnection, participant list should be hidden or not visible
        const participantList = page.locator('[data-testid="participant-list"]');
        await expect(participantList).toBeHidden();
    });

    test("should update participant count with multiple clients", async ({ context, browserName }, testInfo) => {
        // Create two pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        await page1.goto(`/room?id=${roomId}`);
        await page2.goto(`/room?id=${roomId}`);

        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        await expect(page1.locator('[data-testid="participant-list"]')).toContainText("2 participants");
        await expect(page2.locator('[data-testid="participant-list"]')).toContainText("2 participants");

        await page1.close();
        await page2.close();
    });

    test("should update participant count when clients leave", async ({ context, browserName }, testInfo) => {
        // Create three pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();
        const page3 = await context.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate all pages to the room
        await page1.goto(`/room?id=${roomId}`);
        await page2.goto(`/room?id=${roomId}`);
        await page3.goto(`/room?id=${roomId}`);

        // Wait for all to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page3.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // All should show 3 participants
        await expect(page1.locator('[data-testid="participant-list"]')).toContainText("3 participants");
        await expect(page2.locator('[data-testid="participant-list"]')).toContainText("3 participants");
        await expect(page3.locator('[data-testid="participant-list"]')).toContainText("3 participants");

        // Close page3
        await page3.close();

        // Remaining pages should now show 2 participants
        await expect(page1.locator('[data-testid="participant-list"]')).toContainText("2 participants");
        await expect(page2.locator('[data-testid="participant-list"]')).toContainText("2 participants");

        // Close page2
        await page2.close();

        // page1 should now show 1 participant
        await expect(page1.locator('[data-testid="participant-list"]')).toContainText("1 participant");

        await page1.close();
    });

    test("should show participant icons on desktop", async ({ page, browserName }, testInfo) => {
        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Set viewport to desktop size
        await page.setViewportSize({ width: 1024, height: 768 });

        // Navigate to the room
        await page.goto(`/room?id=${roomId}`);

        // Wait for connection
        await expect(page.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Participant list should be visible
        const participantList = page.locator('[data-testid="participant-list"]');
        await expect(participantList).toBeVisible();

        // Desktop view should show additional participant info (icons/flags)
        // Look for the desktop-only container
        const desktopInfo = participantList.locator(".hidden.sm\\:flex");
        await expect(desktopInfo).toBeVisible();
    });

    test("should show simplified view on mobile", async ({ page, browserName }, testInfo) => {
        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Set viewport to mobile size
        await page.setViewportSize({ width: 375, height: 667 });

        // Navigate to the room
        await page.goto(`/room?id=${roomId}`);

        // Wait for connection
        await expect(page.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Participant list should be visible
        const participantList = page.locator('[data-testid="participant-list"]');
        await expect(participantList).toBeVisible();

        // Mobile view should show simplified info
        const mobileInfo = participantList.locator(".sm\\:hidden");
        await expect(mobileInfo).toBeVisible();

        // Desktop info should be hidden on mobile
        const desktopInfo = participantList.locator(".hidden.sm\\:flex");
        await expect(desktopInfo).toBeHidden();
    });

    test("should handle rapid client connections and disconnections", async ({ context, browserName }, testInfo) => {
        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Start with one persistent client
        const persistentPage = await context.newPage();
        await persistentPage.goto(`/room?id=${roomId}`);
        await expect(persistentPage.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(persistentPage.locator('[data-testid="participant-list"]')).toContainText("1 participant");

        // Rapidly add and remove clients
        for (let i = 0; i < 3; i++) {
            const tempPage = await context.newPage();
            await tempPage.goto(`/room?id=${roomId}`);
            await expect(tempPage.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

            // Should show increased count
            await expect(persistentPage.locator('[data-testid="participant-list"]')).toContainText("2 participants");

            // Close the temporary page
            await tempPage.close();

            // Should return to 1 participant
            await expect(persistentPage.locator('[data-testid="participant-list"]')).toContainText("1 participant");
        }

        await persistentPage.close();
    });

    test("should work correctly with room isolation", async ({ context, browserName }, testInfo) => {
        // Create unique room IDs for this test execution
        const timestamp = Date.now().toString(36);
        const roomId1 = `room1-${browserName}-${testInfo.workerIndex}-${timestamp}`;
        const roomId2 = `room2-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Create pages for different rooms
        const page1Room1 = await context.newPage();
        const page2Room1 = await context.newPage();
        const page1Room2 = await context.newPage();

        // Navigate to different rooms
        await page1Room1.goto(`/room?id=${roomId1}`);
        await page2Room1.goto(`/room?id=${roomId1}`);
        await page1Room2.goto(`/room?id=${roomId2}`);

        // Wait for all to connect
        await expect(page1Room1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2Room1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page1Room2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Room 1 should have 2 participants
        await expect(page1Room1.locator('[data-testid="participant-list"]')).toContainText("2 participants");
        await expect(page2Room1.locator('[data-testid="participant-list"]')).toContainText("2 participants");

        // Room 2 should have 1 participant
        await expect(page1Room2.locator('[data-testid="participant-list"]')).toContainText("1 participant");

        await page1Room1.close();
        await page2Room1.close();
        await page1Room2.close();
    });

    test("should display participant info in tooltips on desktop", async ({ page, browserName }, testInfo) => {
        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Set viewport to desktop size
        await page.setViewportSize({ width: 1024, height: 768 });

        // Navigate to the room
        await page.goto(`/room?id=${roomId}`);

        // Wait for connection
        await expect(page.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Participant list should be visible
        const participantList = page.locator('[data-testid="participant-list"]');
        await expect(participantList).toBeVisible();

        // Look for participant info containers that should have title attributes
        const participantInfo = participantList.locator(".bg-stone-100");

        // If participant info exists, it should have a title attribute
        const count = await participantInfo.count();
        if (count > 0) {
            const firstParticipant = participantInfo.first();
            await expect(firstParticipant).toHaveAttribute("title", /.+/);
        }
    });
});
