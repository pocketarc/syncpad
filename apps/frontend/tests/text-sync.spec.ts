import { expect, test } from "@playwright/test";

test.describe("Text Synchronization", () => {
    // Remove the shared beforeEach since we need unique room IDs per test

    test("should sync basic text between two clients", async ({ browser, browserName }, testInfo) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        await Promise.all([page1.goto(`/room?id=${roomId}`), page2.goto(`/room?id=${roomId}`)]);

        // Wait for both pages to be connected
        await Promise.all([
            expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active"),
            expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active"),
        ]);

        // Clear any existing content from both clients
        await page1.locator("textarea").fill("");
        await page2.locator("textarea").fill("");

        // Type text in client 1
        const textarea1 = page1.locator("textarea");
        await textarea1.fill("Hello from client 1!");

        // Wait for it to sync to client 2
        const textarea2 = page2.locator("textarea");
        await page2.waitForFunction(() => document.querySelector("textarea")?.value === "Hello from client 1!", {
            timeout: 10000,
        });

        // Type text in client 2
        await textarea2.fill("Reply from client 2!");

        // Wait for it to sync back to client 1
        await page1.waitForFunction(() => document.querySelector("textarea")?.value === "Reply from client 2!", {
            timeout: 10000,
        });

        await context1.close();
        await context2.close();
    });

    test("should sync text across multiple clients", async ({ browser, browserName }, testInfo) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();
        const context3 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();
        const page3 = await context3.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        await Promise.all([
            page1.goto(`/room?id=${roomId}`),
            page2.goto(`/room?id=${roomId}`),
            page3.goto(`/room?id=${roomId}`),
        ]);

        // Wait for all connections
        await Promise.all([
            expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active"),
            expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active"),
            expect(page3.locator('[data-testid="status-bar"]')).toContainText("Live sync active"),
        ]);

        // Clear any existing content from all clients
        await page1.locator("textarea").fill("");
        await page2.locator("textarea").fill("");
        await page3.locator("textarea").fill("");

        // Type in client 1
        const textarea1 = page1.locator("textarea");
        await textarea1.fill("Message from client 1");

        // Verify it appears in both other clients
        const textarea2 = page2.locator("textarea");
        const textarea3 = page3.locator("textarea");

        await expect(textarea2).toHaveValue("Message from client 1");
        await expect(textarea3).toHaveValue("Message from client 1");

        // Type in client 2
        await textarea2.fill("Update from client 2");

        // Verify it appears in clients 1 and 3
        await expect(textarea1).toHaveValue("Update from client 2");
        await expect(textarea3).toHaveValue("Update from client 2");

        // Type in client 3
        await textarea3.fill("Final message from client 3");

        // Verify it appears in clients 1 and 2
        await expect(textarea1).toHaveValue("Final message from client 3");
        await expect(textarea2).toHaveValue("Final message from client 3");

        await context1.close();
        await context2.close();
        await context3.close();
    });

    test("should handle text replacement correctly", async ({ browser, browserName }, testInfo) => {
        const context1 = await browser.newContext();
        const context2 = await browser.newContext();

        const page1 = await context1.newPage();
        const page2 = await context2.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        await Promise.all([page1.goto(`/room?id=${roomId}`), page2.goto(`/room?id=${roomId}`)]);

        await Promise.all([
            expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active"),
            expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active"),
        ]);

        const textarea1 = page1.locator("textarea");
        const textarea2 = page2.locator("textarea");

        // Clear any existing content from both clients
        await page1.locator("textarea").fill("");
        await page2.locator("textarea").fill("");

        // Start with some initial text
        await textarea1.fill("Initial text content");
        await page2.waitForFunction(() => document.querySelector("textarea")?.value === "Initial text content", {
            timeout: 10000,
        });

        // Replace with completely different text
        await textarea1.fill("Completely replaced content");
        await page2.waitForFunction(() => document.querySelector("textarea")?.value === "Completely replaced content", {
            timeout: 10000,
        });

        // Replace with shorter text
        await textarea2.fill("Short");
        await page1.waitForFunction(() => document.querySelector("textarea")?.value === "Short", { timeout: 10000 });

        // Replace with longer text
        await textarea1.fill(
            "This is a much longer piece of text that should completely replace the previous short text",
        );
        await page2.waitForFunction(
            () =>
                document.querySelector("textarea")?.value ===
                "This is a much longer piece of text that should completely replace the previous short text",
            { timeout: 10000 },
        );

        // Replace with empty text
        await textarea2.fill("");
        await page1.waitForFunction(() => document.querySelector("textarea")?.value === "", { timeout: 10000 });

        // Add text back after empty
        await textarea1.fill("Back to text after empty");
        await page2.waitForFunction(() => document.querySelector("textarea")?.value === "Back to text after empty", {
            timeout: 10000,
        });

        await context1.close();
        await context2.close();
    });
});
