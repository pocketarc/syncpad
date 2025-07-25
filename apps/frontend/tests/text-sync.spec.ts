import { expect, test } from "@playwright/test";
import { setupMultiClientTest } from "./helpers/room";

test.describe("Text Synchronization", () => {
    test("should sync basic text between two clients", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        // Type text in client 1
        const textarea1 = page1.locator("textarea");
        await textarea1.fill("Hello from client 1!");

        // Wait for it to sync to client 2
        const textarea2 = page2.locator("textarea");
        await expect(textarea2).toHaveValue("Hello from client 1!");

        // Type text in client 2
        await textarea2.fill("Reply from client 2!");

        // Wait for it to sync back to client 1
        await expect(textarea1).toHaveValue("Reply from client 2!");
    });

    test("should sync text across multiple clients", async ({ context }) => {
        const [page1, page2, page3] = await setupMultiClientTest(context, 3);

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
    });

    test("should handle text replacement correctly", async ({ context }) => {
        const [page1, page2] = await setupMultiClientTest(context, 2);

        const textarea1 = page1.locator("textarea");
        const textarea2 = page2.locator("textarea");

        // Start with some initial text
        await textarea1.fill("Initial text content");
        await expect(textarea2).toHaveValue("Initial text content");

        // Replace with completely different text
        await textarea1.fill("Completely replaced content");
        await expect(textarea2).toHaveValue("Completely replaced content");

        // Replace with shorter text
        await textarea2.fill("Short");
        await expect(textarea1).toHaveValue("Short");

        // Replace with longer text
        const longText = "This is a much longer piece of text that should completely replace the previous short text";
        await textarea1.fill(longText);
        await expect(textarea2).toHaveValue(longText);

        // Replace with empty text
        await textarea2.fill("");
        await expect(textarea1).toHaveValue("");

        // Add text back after empty
        await textarea1.fill("Back to text after empty");
        await expect(textarea2).toHaveValue("Back to text after empty");
    });
});
