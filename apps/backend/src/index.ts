import { MessageSchema } from "@syncpad/shared/src/types.ts";
import Bun from "bun";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

// Define the shape of the data attached to each WebSocket session.
interface SocketData {
    roomId: string;
}

const port = Number.parseInt(process.env["WEBSOCKET_PORT"] ?? "0");

if (port === 0 || Number.isNaN(port)) {
    throw new Error("WEBSOCKET_PORT environment variable is not set or invalid.");
}

/**
 * Extracts room ID from the WebSocket URL path
 * Expected format: ws://host:port/room-id
 */
function extractRoomId(url: string): string | null {
    try {
        const urlObj = new URL(url);
        // The room ID is the entire path, without the leading slash.
        const roomId = urlObj.pathname.slice(1);
        return roomId || null;
    } catch {
        return null;
    }
}

/**
 * Generates the pub/sub topic name for a room
 */
function getRoomTopic(roomId: string): string {
    return `room:${roomId}`;
}

console.log("Starting Bun WebSocket server...");

const server = Bun.serve<SocketData, Record<never, unknown>>({
    port,

    // This fetch handler is called for every HTTP request.
    // We use it to upgrade requests to WebSockets.
    fetch(req, server) {
        // Extract the public room ID from the URL path.
        const roomId = extractRoomId(req.url);

        // Any non-empty string is a valid room ID now.
        if (!roomId) {
            return new Response("Invalid or missing room ID", { status: 400 });
        }

        // Attempt to upgrade the request to a WebSocket connection.
        // Pass the room ID as data to be available in WebSocket handlers.
        if (server.upgrade(req, { data: { roomId } })) {
            return; // Bun handles the response for successful upgrades.
        }
        return new Response("Upgrade failed :(", { status: 500 });
    },

    // This object defines the handlers for WebSocket events.
    websocket: {
        // This handler is called when a client connects.
        open(ws) {
            const { roomId } = ws.data;
            const roomTopic = getRoomTopic(roomId);

            console.log(`Client connected to room: ${roomId}`);
            ws.subscribe(roomTopic);
        },

        // This handler is called when a client sends a message.
        message(ws, message) {
            const { roomId } = ws.data;
            const roomTopic = getRoomTopic(roomId);

            // With E2EE, the server sees an opaque payload. It can still parse it,
            // but it cannot decrypt it. We can handle special cases like "ping" messages.
            try {
                const json = JSON.parse(message.toString());
                const parsed = MessageSchema.safeParse(json);

                if (!parsed.success) {
                    console.error("Invalid message format:", parsed.error);
                    ws.send(JSON.stringify({ type: "error", message: "Invalid message format." }));
                    return;
                }

                if (parsed.data.type === "ping") {
                    ws.send(JSON.stringify({ type: "pong" }));
                    return;
                }

                // Broadcast the raw message to all other clients in the same room.
                ws.publish(roomTopic, message);
            } catch (e) {
                // Not a JSON message or invalid JSON format.
                console.error("Failed to parse message:", e);
                ws.send(JSON.stringify({ type: "error", message: "Failed to parse message." }));
                return;
            }
        },

        // This handler is called when a client disconnects.
        close(ws, code, reason) {
            const { roomId } = ws.data;
            console.log(`Client disconnected from room ${roomId}`, { code, reason });
        },
    },
});

console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
