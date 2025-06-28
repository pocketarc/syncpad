import Bun from "bun";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

if (!process.env["SCRATCHPAD_TOPIC"]) {
    throw new Error("SCRATCHPAD_TOPIC environment variable is not set.");
}

const scratchpadTopic = process.env["SCRATCHPAD_TOPIC"];
const port = Number.parseInt(process.env["WEBSOCKET_PORT"] ?? "0");

if (port === 0 || Number.isNaN(port)) {
    throw new Error("WEBSOCKET_PORT environment variable is not set or invalid.");
}

console.log("Starting Bun WebSocket server...");

const server = Bun.serve({
    port,

    // This fetch handler is called for every HTTP request.
    // We use it to upgrade requests to WebSockets.
    fetch(req, server) {
        // Attempt to upgrade the request to a WebSocket connection.
        // The second argument (`data`) is how we can attach contextual info,
        // though we don't need it for this simple app.
        if (server.upgrade(req)) {
            return; // Bun handles the response for successful upgrades.
        }
        return new Response("Upgrade failed :(", { status: 500 });
    },

    // This object defines the handlers for WebSocket events.
    // As the docs note, these are defined once per server for efficiency.
    websocket: {
        // This handler is called when a client connects.
        open(ws) {
            console.log("Client connected");
            // Subscribe the new client to our shared scratchpad topic.
            ws.subscribe(scratchpadTopic);
        },

        // This handler is called when a client sends a message.
        message(_ws, message) {
            console.log(`Received message: ${message.toString().substring(0, 50)}...`);
            // We publish the received message to all clients subscribed to the topic.
            // This is the core of the sync functionality.
            // `server.publish` sends to ALL subscribers. `ws.publish` sends to all EXCEPT the sender.
            // We use `server.publish` to ensure the message is broadcast to everyone.
            server.publish(scratchpadTopic, message);
        },

        // This handler is called when a client disconnects.
        close(_ws, code, reason) {
            console.log("Client disconnected", { code, reason });
            // The client is automatically unsubscribed from topics on close.
        },
    },
});

console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
