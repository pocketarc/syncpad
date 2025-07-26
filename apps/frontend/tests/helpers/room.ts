import { type BrowserContext, expect, type Page } from "@playwright/test";

type AllowedClientCounts = 1 | 2 | 3 | 4 | 5;
type MultiClientTestResult<T extends AllowedClientCounts> = T extends 1
    ? [Page]
    : T extends 2
      ? [Page, Page]
      : T extends 3
        ? [Page, Page, Page]
        : T extends 4
          ? [Page, Page, Page, Page]
          : T extends 5
            ? [Page, Page, Page, Page, Page]
            : never;

/**
 * Sets up a multi-client test environment.
 *
 * @param context The Playwright browser context.
 * @param clientCount The number of clients (pages) to create.
 * @returns A promise that resolves to an array of connected pages.
 */
export async function setupMultiClientTest<ClientCount extends AllowedClientCounts>(
    context: BrowserContext,
    clientCount: ClientCount,
): Promise<MultiClientTestResult<ClientCount>> {
    if (clientCount < 1) {
        throw new Error("Must create at least one client.");
    }

    // Create all pages first
    const pages: Page[] = [];
    for (let i = 0; i < clientCount; i++) {
        pages.push(await context.newPage());
    }

    if (!pages[0]) {
        throw new Error("Failed to create the first page.");
    }

    // Navigate the first page and get the room URL
    const firstPage = pages[0];
    await firstPage.goto("/");
    await firstPage.waitForURL(/room#([a-z]+-){3}[a-z]+$/);
    const roomUrl = firstPage.url();

    // Extract the room ID from the URL
    const roomIdMatch = roomUrl.match(/room#(.+)$/);
    const roomId = roomIdMatch?.[1];

    if (!roomId) {
        throw new Error(`Failed to extract room ID from URL: ${roomUrl}`);
    }

    // Navigate the rest of the pages to the same room
    const navigationPromises = pages.slice(1).map(async (page) => {
        await page.goto(roomUrl);
        await expect(page.locator('[data-testid="status-bar"]')).toContainText("Live sync active");
        await expect(page.locator('[data-testid="roomid"]')).toHaveText(roomId);
    });
    await Promise.all(navigationPromises);

    // We use `as` here but this is safe because we ensure the number of pages matches the client count.
    return pages as MultiClientTestResult<ClientCount>;
}
