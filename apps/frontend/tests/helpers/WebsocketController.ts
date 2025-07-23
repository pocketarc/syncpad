import type {Page, WebSocketRoute} from "playwright-core";

export class WebsocketController {
	protected websocketUrlRegex = /^ws:/;
	protected shouldCloseWebSocket = false;
	protected page: Page;
	protected ws: WebSocketRoute | null = null;

	protected constructor(page: Page, websocketUrlRegex?: RegExp) {
		this.page = page;
		if (websocketUrlRegex) {
			this.websocketUrlRegex = websocketUrlRegex;
		}
	}

	static async interceptWebSocket(page: Page, websocketUrlRegex?: RegExp) {
		const instance = new WebsocketController(page, websocketUrlRegex);
		await instance.page.routeWebSocket(instance.websocketUrlRegex, async (ws) => {
			if (instance.shouldCloseWebSocket) {
				await ws.close();
			} else {
				const server = ws.connectToServer();
				instance.ws = server;
				ws.onMessage((message) => server.send(message));
				server.onMessage((message) => ws.send(message.toString()));
				ws.onClose(() => server.close());
				server.onClose(() => ws.close());
			}
		});
		return instance;
	}

	async block() {
		if (this.ws) {
			await this.ws.close();
			this.ws = null;
		}

		this.shouldCloseWebSocket = true;
	}

	async unblock() {
		this.shouldCloseWebSocket = false;
	}
}