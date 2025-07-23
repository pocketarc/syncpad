import {expect, test} from "@playwright/test";
import {WebsocketController} from "./helpers/WebsocketController.ts";

test.describe("Auto-reconnection functionality", () => {
	test("should handle network interruption gracefully", async ({page}) => {
		const controller = await WebsocketController.interceptWebSocket(page);

		// Navigate to the application and wait for connection
		await page.goto("/room?id=test-blue-cat-moon");
		await expect(page.getByTestId("status-bar")).toContainText("Live sync active");

		// Enable blocking and force a reconnection attempt
		await controller.block();
		await page.reload();

		// Should show reconnecting status when WebSocket can't connect
		await expect(page.getByTestId("status-bar")).toHaveText(/Reconnecting/);

		// Disable blocking to allow reconnection
		await controller.unblock();

		// Should eventually reconnect
		await expect(page.getByTestId("status-bar")).toContainText("Live sync active");
	});
});
