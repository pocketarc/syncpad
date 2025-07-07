import { expect, test } from "@playwright/test";

test.describe("Room Functionality", () => {
    test("should redirect from root to a new room", async ({ page }) => {
        await page.goto("/");

        // Wait for redirect to complete
        await page.waitForURL(/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        // Verify we're on a room page with proper format
        const url = new URL(page.url());
        const roomId = url.searchParams.get("id");
        expect(roomId).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        // Verify room ID is displayed in the UI
        await expect(page.locator("text=Room:")).toBeVisible();
        await expect(page.locator(`text=${roomId}`)).toBeVisible();
    });

    test("should show share room button", async ({ page }) => {
        await page.goto("/");
        await page.waitForURL(/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        // Verify share room button exists
        await expect(page.locator("button", { hasText: "📋 Share Room" })).toBeVisible();
    });

    test("should isolate rooms - messages don't cross between rooms", async ({ browser }) => {
        // Create two pages for different rooms
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Go to root on both pages to get different room IDs
        await page1.goto("/");
        await page2.goto("/");

        // Wait for redirects and get room IDs
        await page1.waitForURL(/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
        await page2.waitForURL(/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        const room1Id = new URL(page1.url()).searchParams.get("id");
        const room2Id = new URL(page2.url()).searchParams.get("id");

        // Ensure rooms are different
        expect(room1Id).not.toBe(room2Id);

        // Wait for both clients to be connected
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Type in room 1
        const textarea1 = page1.locator("textarea");
        await textarea1.fill("Message from room 1");

        // Type in room 2
        const textarea2 = page2.locator("textarea");
        await textarea2.fill("Message from room 2");

        // Wait a moment for potential synchronization
        await page1.waitForTimeout(500);

        // Verify messages stayed in their respective rooms
        await expect(textarea1).toHaveValue("Message from room 1");
        await expect(textarea2).toHaveValue("Message from room 2");

        await context1.close();
        await context2.close();
    });

    test("should sync messages within the same room", async ({ browser }) => {
        const context = await browser.newContext();
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Go to the same room on both pages
        await page1.goto("/");
        await page1.waitForURL(/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        const roomUrl = page1.url();
        await page2.goto(roomUrl);

        // Wait for both clients to be connected
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Type in the first client
        const textarea1 = page1.locator("textarea");
        const textarea2 = page2.locator("textarea");

        await textarea1.fill("Hello from client 1");

        // Verify the message appears in the second client
        await expect(textarea2).toHaveValue("Hello from client 1");

        // Type in the second client
        await textarea2.fill("Hello from client 2");

        // Verify the message appears in the first client
        await expect(textarea1).toHaveValue("Hello from client 2");

        await context.close();
    });

    test("should handle file uploads within the same room", async ({ browser }) => {
        const context = await browser.newContext();
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Go to the same room on both pages
        await page1.goto("/");
        await page1.waitForURL(/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        const roomUrl = page1.url();
        await page2.goto(roomUrl);

        // Wait for both clients to be connected
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");

        // Set up download listening on page2
        const downloadPromise = page2.waitForEvent("download");

        // Create a test file and upload it from page1
        const fileContent = "Hello, this is a test file!";
        await page1.setInputFiles('input[type="file"]', {
            name: "test-room-file.txt",
            mimeType: "text/plain",
            buffer: Buffer.from(fileContent),
        });

        // Wait for download to trigger on page2
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe("test-room-file.txt");

        await context.close();
    });

    test("should handle invalid room IDs", async ({ page }) => {
        // Try to navigate to an invalid room ID
        await page.goto("/room?id=invalid-room-id");

        // Should redirect back to home and then to a new valid room
        await page.waitForURL(/\/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        // Verify we end up in a valid room
        const url = new URL(page.url());
        const roomId = url.searchParams.get("id");
        expect(roomId).toMatch(/^[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);
    });

    test("should copy room URL to clipboard when share button is clicked", async ({ page, context, browserName }) => {
        // Only run clipboard test on Chromium for now due to permission issues on other browsers
        if (browserName !== "chromium") {
            test.skip();
        }

        // Grant clipboard permissions (Chromium only)
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);

        await page.goto("/");
        await page.waitForURL(/room\?id=[a-z]+-[a-z]+-[a-z]+-[a-z]+$/);

        const roomUrl = page.url();

        // Click the share button
        await page.click("button:has-text('📋 Share Room')");

        // Wait a moment for clipboard operation
        await page.waitForTimeout(100);

        // Verify clipboard contains the room URL
        const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
        expect(clipboardText).toBe(roomUrl);
    });
});
