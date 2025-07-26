import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { setupMultiClientTest } from "./helpers/room";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("File Upload - No Self Download", () => {
    test("sender should not download their own uploaded file", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        // Create a test file to upload
        const testFilePath = path.join(__dirname, "fixtures", "test.txt");

        // Track downloads on both pages - set up listeners BEFORE uploading
        const page1Downloads: string[] = [];
        page1.on("download", (download) => page1Downloads.push(download.suggestedFilename()));

        const downloadPromise = page2.waitForEvent("download");

        // Upload file from page1 (sender)
        await page1.locator('input[type="file"]').setInputFiles(testFilePath);

        // Wait for the file to be processed and received by page2
        const download = await downloadPromise;

        // Verify that page1 (sender) did NOT download the file
        expect(page1Downloads).toHaveLength(0);

        // Verify that page2 (receiver) DID download the file
        expect(download.suggestedFilename()).toBe("test.txt");
    });

    test("multiple senders should not download their own files", async ({ context }) => {
        const [page1, page2, page3] = await setupMultiClientTest(context, 3);

        // Track downloads on all pages
        const page1Downloads: string[] = [];
        const page2Downloads: string[] = [];
        const page3Downloads: string[] = [];

        page1.on("download", (download) => page1Downloads.push(download.suggestedFilename()));
        page2.on("download", (download) => page2Downloads.push(download.suggestedFilename()));
        page3.on("download", (download) => page3Downloads.push(download.suggestedFilename()));

        // Create test files
        const testFile1Path = path.join(__dirname, "fixtures", "test.txt");
        const testFile2Path = path.join(__dirname, "fixtures", "sample.json");

        // Upload file from page1 and wait for others to receive it
        const downloadFrom1Promise = Promise.all([page2.waitForEvent("download"), page3.waitForEvent("download")]);
        await page1.locator('input[type="file"]').setInputFiles(testFile1Path);
        await downloadFrom1Promise;

        // Upload file from page2 and wait for others to receive it
        const downloadFrom2Promise = Promise.all([page1.waitForEvent("download"), page3.waitForEvent("download")]);
        await page2.locator('input[type="file"]').setInputFiles(testFile2Path);
        await downloadFrom2Promise;

        // Verify download behavior:
        // Page1 sent test.txt, should only receive sample.json
        expect(page1Downloads).toHaveLength(1);
        expect(page1Downloads[0]).toBe("sample.json");

        // Page2 sent sample.json, should only receive test.txt
        expect(page2Downloads).toHaveLength(1);
        expect(page2Downloads[0]).toBe("test.txt");

        // Page3 sent nothing, should receive both files
        expect(page3Downloads).toHaveLength(2);
        expect(page3Downloads).toContain("test.txt");
        expect(page3Downloads).toContain("sample.json");
    });
});
