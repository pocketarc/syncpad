import Bun from "bun";
import { config as dotenvConfig } from "dotenv";

dotenvConfig();

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
        const roomId = urlObj.pathname.slice(1); // Remove leading slash
        return roomId || null;
    } catch {
        return null;
    }
}

/**
 * Validates room ID format (4 words separated by hyphens)
 */
function isValidRoomId(roomId: string): boolean {
    if (!roomId || typeof roomId !== "string") {
        return false;
    }

    const parts = roomId.split("-");
    return parts.length === 4 && parts.every((part) => part.length > 0);
}

/**
 * Generates the pub/sub topic name for a room
 */
function getRoomTopic(roomId: string): string {
    return `room:${roomId}`;
}

console.log("Starting Bun WebSocket server...");

const server = Bun.serve({
    port,

    // This fetch handler is called for every HTTP request.
    // We use it to upgrade requests to WebSockets.
    fetch(req, server) {
        // Extract room ID from the URL
        const roomId = extractRoomId(req.url);

        if (!roomId || !isValidRoomId(roomId)) {
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
    // As the docs note, these are defined once per server for efficiency.
    websocket: {
        // This handler is called when a client connects.
        open(ws) {
            const { roomId } = ws.data as { roomId: string };
            const roomTopic = getRoomTopic(roomId);

            console.log(`Client connected to room: ${roomId}`);
            // Subscribe the new client to the room-specific topic.
            ws.subscribe(roomTopic);
        },

        // This handler is called when a client sends a message.
        message(ws, message) {
            const { roomId } = ws.data as { roomId: string };
            const roomTopic = getRoomTopic(roomId);

            console.log(`Received message in room ${roomId}: ${message.toString().substring(0, 50)}...`);

            try {
                const parsedMessage = JSON.parse(message.toString());

                // Handle ping/pong for connection liveness detection.
                if (parsedMessage.type === "ping") {
                    // Respond directly to the sender with pong.
                    ws.send(JSON.stringify({ type: "pong", payload: null }));
                    return;
                }

                // For pong messages, we don't need to do anything special.
                if (parsedMessage.type === "pong") {
                    return;
                }

                // For all other message types (text, file), broadcast to clients in the same room.
                server.publish(roomTopic, message);
            } catch (error) {
                console.error("Failed to parse message:", error);
                // If parsing fails, still broadcast the raw message for backward compatibility.
                server.publish(roomTopic, message);
            }
        },

        // This handler is called when a client disconnects.
        close(ws, code, reason) {
            const { roomId } = ws.data as { roomId: string };
            console.log(`Client disconnected from room ${roomId}`, { code, reason });
            // The client is automatically unsubscribed from topics on close.
        },
    },
});

console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
