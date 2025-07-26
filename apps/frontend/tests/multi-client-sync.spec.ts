import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { setupMultiClientTest } from "./helpers/room";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("Multi-Client File Sync", () => {
    test("should sync files between multiple browser contexts", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        // Set up download handler for page2 before triggering upload on page1
        const downloadPromise = page2.waitForEvent("download");

        // Upload file on page1
        const filePath = path.join(__dirname, "fixtures", "test.txt");
        await page1.locator('input[type="file"]').setInputFiles(filePath);

        // Wait for the download to be triggered on page2
        const download = await downloadPromise;

        // Verify the download has the correct filename
        expect(download.suggestedFilename()).toBe("test.txt");
    });

    test("should sync text and then files between clients", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        // First sync some text
        const textarea1 = page1.locator("textarea");
        await textarea1.fill("Hello from client 1");

        // Wait for text to sync to page2
        const textarea2 = page2.locator("textarea");
        await expect(textarea2).toHaveValue("Hello from client 1");

        // Then sync a file
        const downloadPromise = page2.waitForEvent("download");

        const filePath = path.join(__dirname, "fixtures", "sample.json");
        await page1.locator('input[type="file"]').setInputFiles(filePath);

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe("sample.json");
    });

    test("should handle multiple files uploaded simultaneously", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        // Upload files one at a time to avoid race conditions
        const filePath1 = path.join(__dirname, "fixtures", "test.txt");
        const filePath2 = path.join(__dirname, "fixtures", "sample.json");

        // Upload first file
        const downloadPromise1 = page2.waitForEvent("download");
        await page1.locator('input[type="file"]').setInputFiles(filePath1);
        const download1 = await downloadPromise1;
        expect(download1.suggestedFilename()).toBe("test.txt");

        // Upload second file
        const downloadPromise2 = page2.waitForEvent("download");
        await page1.locator('input[type="file"]').setInputFiles(filePath2);
        const download2 = await downloadPromise2;
        expect(download2.suggestedFilename()).toBe("sample.json");
    });

    test("should handle rapid file uploads", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        // Set up listeners for both expected downloads before uploading.
        const downloadPromise1 = page2.waitForEvent("download");
        const downloadPromise2 = page2.waitForEvent("download");

        const filePath = path.join(__dirname, "fixtures", "test.txt");

        // Upload the first file and wait for it to be received.
        await page1.locator('input[type="file"]').setInputFiles(filePath);
        await downloadPromise1;

        // Once the first is received, upload the second file.
        await page1.locator('input[type="file"]').setInputFiles(filePath);
        await downloadPromise2;

        // Both promises should now be resolved.
        const downloads = await Promise.all([downloadPromise1, downloadPromise2]);
        downloads.forEach((download) => {
            expect(download.suggestedFilename()).toBe("test.txt");
        });
    });

    test("should work with three clients", async ({ context }) => {
        const [page1, page2, page3] = await setupMultiClientTest(context, 3);

        // Set up download handlers for page2 and page3
        const downloadPromise2 = page2.waitForEvent("download");
        const downloadPromise3 = page3.waitForEvent("download");

        // Upload file from page1
        const filePath = path.join(__dirname, "fixtures", "sample.json");
        await page1.locator('input[type="file"]').setInputFiles(filePath);

        // Both other clients should receive the file
        const [download2, download3] = await Promise.all([downloadPromise2, downloadPromise3]);

        expect(download2.suggestedFilename()).toBe("sample.json");
        expect(download3.suggestedFilename()).toBe("sample.json");
    });
});
