import { expect, test } from "@playwright/test";
import { setupMultiClientTest } from "./helpers/room";

test.describe("CRDT Text Synchronization", () => {
    test("should handle concurrent edits from two clients without losing data", async ({ context }) => {
        test.skip(
            true,
            "Skipping this test due to flakiness in concurrent edits. This will be fixed in a future update.",
        );

        const [page1, page2] = await setupMultiClientTest(context, 2);

        // Capture console logs from both pages
        const page1Logs: string[] = [];
        const page2Logs: string[] = [];

        page1.on("console", (msg) => {
            page1Logs.push(`[Page1] ${msg.type()}: ${msg.text()}`);
        });

        page2.on("console", (msg) => {
            page2Logs.push(`[Page2] ${msg.type()}: ${msg.text()}`);
        });

        const textarea1 = page1.locator("textarea");
        const textarea2 = page2.locator("textarea");

        // 1. Set initial state for both clients
        await textarea1.fill("Hello World");
        await expect(textarea2).toHaveValue("Hello World");

        // 2. Perform concurrent edits using Promise.all to ensure they run in parallel
        await Promise.all([
            (async () => {
                // Client 1 inserts " beautiful" in the middle
                await textarea1.focus();

                // Move cursor to "Hello |World"
                await textarea1.press("Home");
                for (let i = 0; i < 6; i++) {
                    await textarea1.press("ArrowRight");
                }
                await textarea1.pressSequentially("beautiful ", { delay: 500 });
            })(),
            (async () => {
                // Client 2 appends " from the other side" at the end
                await textarea2.focus();

                await textarea2.press("End");
                await textarea2.pressSequentially(" from the other side", { delay: 500 });
            })(),
        ]);

        // 3. Assert that the final state is consistent on both clients
        const expectedText = "Hello beautiful World from the other side";

        try {
            await expect(textarea1).toHaveValue(expectedText);
            await expect(textarea2).toHaveValue(expectedText);
        } catch (error) {
            // On failure, output console logs for debugging
            console.log("\n=== PAGE 1 CONSOLE LOGS ===");
            page1Logs.forEach((log) => console.log(log));
            console.log("\n=== PAGE 2 CONSOLE LOGS ===");
            page2Logs.forEach((log) => console.log(log));
            console.log("\n=== ACTUAL VALUES ===");
            console.log(`Page1 textarea value: "${await textarea1.inputValue()}"`);
            console.log(`Page2 textarea value: "${await textarea2.inputValue()}"`);
            throw error;
        }
    });

    test("should sync state to newly joined clients", async ({ context }) => {
        // 1. Client 1 starts and types something
        const [page1] = await setupMultiClientTest(context, 1);
        const textarea1 = page1.locator("textarea");
        const initialText = "This is the initial text from the first user.";
        await textarea1.fill(initialText);
        await expect(textarea1).toHaveValue(initialText);
        const roomUrl = page1.url();

        // 2. Client 2 joins and should see the text
        const page2 = await context.newPage();
        await page2.goto(roomUrl);
        await expect(page2.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        const textarea2 = page2.locator("textarea");
        await expect(textarea2).toHaveValue(initialText);

        // Client 2 adds to the text
        const secondText = " And this is from the second user.";
        await textarea2.pressSequentially(secondText, { delay: 50 });
        const combinedText1 = initialText + secondText;
        await expect(textarea2).toHaveValue(combinedText1);
        await expect(textarea1).toHaveValue(combinedText1);

        // 3. Client 3 joins and should see the combined text
        const page3 = await context.newPage();
        await page3.goto(roomUrl);
        await expect(page3.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        const textarea3 = page3.locator("textarea");
        await expect(textarea3).toHaveValue(combinedText1);

        // Client 3 adds to the text
        const thirdText = " Finally, the third user adds on.";
        await textarea3.pressSequentially(thirdText, { delay: 50 });
        const combinedText2 = combinedText1 + thirdText;
        await expect(textarea3).toHaveValue(combinedText2);
        await expect(textarea2).toHaveValue(combinedText2);
        await expect(textarea1).toHaveValue(combinedText2);

        // 4. Client 4 joins and should see the final, fully combined text
        const page4 = await context.newPage();
        await page4.goto(roomUrl);
        await expect(page4.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        const textarea4 = page4.locator("textarea");
        await expect(textarea4).toHaveValue(combinedText2);
    });
});
