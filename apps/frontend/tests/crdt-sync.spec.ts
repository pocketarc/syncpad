import { expect, test } from "@playwright/test";
import { setupMultiClientTest } from "./helpers/room";

test.describe("CRDT Text Synchronization", () => {
    test("should handle concurrent edits from two clients without losing data", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        const textarea1 = page1.locator("textarea");
        const textarea2 = page2.locator("textarea");

        // Initial state
        await textarea1.fill("Hello World");
        await expect(textarea2).toHaveValue("Hello World");

        // Concurrent, non-conflicting edits
        // Client 1 types " beautiful" in the middle
        await textarea1.focus();
        await page1.keyboard.press("ArrowRight");
        await page1.keyboard.press("ArrowRight");
        await page1.keyboard.press("ArrowRight");
        await page1.keyboard.press("ArrowRight");
        await page1.keyboard.press("ArrowRight");
        await textarea1.type(" beautiful");

        // Client 2 types " from the other side" at the end
        await textarea2.focus();
        await page2.keyboard.press("End");
        await textarea2.type(" from the other side");

        // Assert final state is consistent on both clients
        const expectedText = "Hello beautiful World from the other side";
        await expect(textarea1).toHaveValue(expectedText);
        await expect(textarea2).toHaveValue(expectedText);
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
        await textarea2.type(secondText);
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
        await textarea3.type(thirdText);
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
