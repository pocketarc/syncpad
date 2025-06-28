import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test.describe("File Upload - No Self Download", () => {
    test("sender should not download their own uploaded file", async ({ context }) => {
        // Create two pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();

        // Navigate both pages to the app
        await page1.goto("/");
        await page2.goto("/");

        // Wait for both to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Connected");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Connected");

        // Track downloads on both pages
        const page1Downloads: string[] = [];
        const page2Downloads: string[] = [];

        page1.on("download", (download) => {
            page1Downloads.push(download.suggestedFilename());
        });

        page2.on("download", (download) => {
            page2Downloads.push(download.suggestedFilename());
        });

        // Create a test file to upload
        const testFilePath = path.join(__dirname, "fixtures", "test.txt");

        // Upload file from page1 (sender)
        const fileInput1 = page1.locator('input[type="file"]');
        await fileInput1.setInputFiles(testFilePath);

        // Wait a moment for the file to be processed and potentially downloaded
        await page1.waitForTimeout(1000);

        // Verify that page1 (sender) did NOT download the file
        expect(page1Downloads).toHaveLength(0);

        // Verify that page2 (receiver) DID download the file
        expect(page2Downloads).toHaveLength(1);
        expect(page2Downloads[0]).toBe("test.txt");

        await page1.close();
        await page2.close();
    });

    test("multiple senders should not download their own files", async ({ context }) => {
        // Create three pages (clients)
        const page1 = await context.newPage();
        const page2 = await context.newPage();
        const page3 = await context.newPage();

        // Navigate all pages to the app
        await page1.goto("/");
        await page2.goto("/");
        await page3.goto("/");

        // Wait for all to connect
        await expect(page1.locator('[data-testid="status-bar"]')).toContainText("Connected");
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Connected");
        await expect(page3.locator('[data-testid="status-bar"]')).toContainText("Connected");

        // Track downloads on all pages
        const page1Downloads: string[] = [];
        const page2Downloads: string[] = [];
        const page3Downloads: string[] = [];

        page1.on("download", (download) => {
            page1Downloads.push(download.suggestedFilename());
        });

        page2.on("download", (download) => {
            page2Downloads.push(download.suggestedFilename());
        });

        page3.on("download", (download) => {
            page3Downloads.push(download.suggestedFilename());
        });

        // Create test files
        const testFile1Path = path.join(__dirname, "fixtures", "test.txt");
        const testFile2Path = path.join(__dirname, "fixtures", "sample.json");

        // Upload file from page1
        const fileInput1 = page1.locator('input[type="file"]');
        await fileInput1.setInputFiles(testFile1Path);

        // Wait a moment
        await page1.waitForTimeout(500);

        // Upload file from page2
        const fileInput2 = page2.locator('input[type="file"]');
        await fileInput2.setInputFiles(testFile2Path);

        // Wait for all processing to complete
        await page1.waitForTimeout(1000);

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

        await page1.close();
        await page2.close();
        await page3.close();
    });
});
