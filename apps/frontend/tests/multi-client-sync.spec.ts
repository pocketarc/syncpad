import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Multi-Client File Sync", () => {
    test("should sync files between multiple browser contexts", async ({ context, browserName }, testInfo) => {
        // Create two pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate both pages to the app
        await page1.goto(`/room?id=${roomId}`);
        await page2.goto(`/room?id=${roomId}`);

        // Wait for both to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page1.locator('[data-testid="roomid"]')).toHaveText(roomId);
        await expect(page2.locator('[data-testid="roomid"]')).toHaveText(roomId);

        // Set up download handler for page2 before triggering upload on page1
        const downloadPromise = page2.waitForEvent("download");

        // Upload file on page1
        const filePath = path.join(__dirname, "fixtures", "test.txt");
        const dropZone1 = page1.locator('[aria-label="File drop zone"]');
        await dropZone1.click();

        const fileInput1 = page1.locator('input[type="file"]');
        await fileInput1.setInputFiles(filePath);

        // Wait for the download to be triggered on page2
        const download = await downloadPromise;

        // Verify the download has the correct filename
        expect(download.suggestedFilename()).toBe("test.txt");

        await page1.close();
        await page2.close();
    });

    test("should sync text and then files between clients", async ({ context, browserName }, testInfo) => {
        // Create two pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate both pages to the app
        await page1.goto(`/room?id=${roomId}`);
        await page2.goto(`/room?id=${roomId}`);

        // Wait for both to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page1.locator('[data-testid="roomid"]')).toHaveText(roomId);
        await expect(page2.locator('[data-testid="roomid"]')).toHaveText(roomId);

        // First sync some text
        const textarea1 = page1.locator("textarea");
        await textarea1.fill("Hello from client 1");

        // Wait for text to sync to page2
        const textarea2 = page2.locator("textarea");
        await expect(textarea2).toHaveValue("Hello from client 1");

        // Then sync a file
        const downloadPromise = page2.waitForEvent("download");

        const filePath = path.join(__dirname, "fixtures", "sample.json");
        await page1.locator('[aria-label="File drop zone"]').click();
        await page1.locator('input[type="file"]').setInputFiles(filePath);

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.(json|txt)$/);

        await page1.close();
        await page2.close();
    });

    test("should handle multiple files uploaded simultaneously", async ({ context, browserName }, testInfo) => {
        // Create two pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate both pages to the app
        await page1.goto(`/room?id=${roomId}`);
        await page2.goto(`/room?id=${roomId}`);

        // Wait for both to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page1.locator('[data-testid="roomid"]')).toHaveText(roomId);
        await expect(page2.locator('[data-testid="roomid"]')).toHaveText(roomId);

        // Upload files one at a time to avoid race conditions
        const filePath1 = path.join(__dirname, "fixtures", "test.txt");
        const filePath2 = path.join(__dirname, "fixtures", "sample.json");

        const downloads = [];

        // Upload first file
        const downloadPromise1 = page2.waitForEvent("download");
        await page1.locator('[aria-label="File drop zone"]').click();
        await page1.locator('input[type="file"]').setInputFiles(filePath1);
        downloads.push(await downloadPromise1);

        // Wait a bit before uploading second file
        await page1.waitForTimeout(500);

        // Upload second file
        const downloadPromise2 = page2.waitForEvent("download");
        await page1.locator('[aria-label="File drop zone"]').click();
        await page1.locator('input[type="file"]').setInputFiles(filePath2);
        downloads.push(await downloadPromise2);

        // Verify both files were received (order may vary)
        const filenames = downloads.map((d) => d.suggestedFilename());
        expect(filenames).toHaveLength(2);
        expect(filenames.every((name) => name.match(/\.(json|txt)$/))).toBe(true);

        await page1.close();
        await page2.close();
    });

    test("should handle rapid file uploads", async ({ context, browserName }, testInfo) => {
        // Create two pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate both pages to the app
        await page1.goto(`/room?id=${roomId}`);
        await page2.goto(`/room?id=${roomId}`);

        // Wait for both to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page1.locator('[data-testid="roomid"]')).toHaveText(roomId);
        await expect(page2.locator('[data-testid="roomid"]')).toHaveText(roomId);

        // Upload files rapidly
        const downloadPromises = [page2.waitForEvent("download"), page2.waitForEvent("download")];

        const filePath = path.join(__dirname, "fixtures", "test.txt");

        // Upload the same file twice in quick succession
        await page1.locator('[aria-label="File drop zone"]').click();
        await page1.locator('input[type="file"]').setInputFiles(filePath);

        // Small delay then upload again
        await page1.waitForTimeout(100);

        await page1.locator('[aria-label="File drop zone"]').click();
        await page1.locator('input[type="file"]').setInputFiles(filePath);

        // Both should be received
        const downloads = await Promise.all(downloadPromises);
        downloads.forEach((download) => {
            expect(download.suggestedFilename()).toMatch(/\.(json|txt)$/);
        });

        await page1.close();
        await page2.close();
    });

    test("should work with three clients", async ({ context, browserName }, testInfo) => {
        // Create three pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();
        const page3 = await context.newPage();

        // Create unique room ID for this test execution
        const timestamp = Date.now().toString(36);
        const roomId = `test-${browserName}-${testInfo.workerIndex}-${timestamp}`;

        // Navigate all pages to the app
        await page1.goto(`/room?id=${roomId}`);
        await page2.goto(`/room?id=${roomId}`);
        await page3.goto(`/room?id=${roomId}`);

        // Wait for all to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page3.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page1.locator('[data-testid="roomid"]')).toHaveText(roomId);
        await expect(page2.locator('[data-testid="roomid"]')).toHaveText(roomId);
        await expect(page3.locator('[data-testid="roomid"]')).toHaveText(roomId);

        // Set up download handlers for page2 and page3
        const downloadPromise2 = page2.waitForEvent("download");
        const downloadPromise3 = page3.waitForEvent("download");

        // Upload file from page1
        const filePath = path.join(__dirname, "fixtures", "sample.json");
        await page1.locator('[aria-label="File drop zone"]').click();
        await page1.locator('input[type="file"]').setInputFiles(filePath);

        // Both other clients should receive the file
        const [download2, download3] = await Promise.all([downloadPromise2, downloadPromise3]);

        expect(download2.suggestedFilename()).toMatch(/\.(json|txt)$/);
        expect(download3.suggestedFilename()).toMatch(/\.(json|txt)$/);

        await page1.close();
        await page2.close();
        await page3.close();
    });
});
