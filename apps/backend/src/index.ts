import { isValidRoomId } from "@syncpad/shared/src/isValidRoomId.ts";
import { type Participant, WebSocketConnectionSchema, WebSocketMessageSchema } from "@syncpad/shared/src/types.ts";
import Bun from "bun";
import { config as dotenvConfig } from "dotenv";
import { ZodError } from "zod";

dotenvConfig();

const port = Number.parseInt(process.env["WEBSOCKET_PORT"] ?? "0");
const roomParticipants = new Map<string, Map<string, Participant>>();

if (port === 0 || Number.isNaN(port)) {
    throw new Error("WEBSOCKET_PORT environment variable is not set or invalid.");
}

/**
 * Looks up country code from IP address, trying Cloudflare header first.
 */
async function getCountryFromIP(req: Request, ip: string | null): Promise<string | null> {
    // First, try Cloudflare's CF-IPCountry header.
    const cfCountry = req.headers.get("CF-IPCountry");
    if (cfCountry && cfCountry !== "XX") {
        return cfCountry;
    }

    // If no IP available or localhost, return null.
    if (!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
        return null;
    }

    // Fallback to IP-API service (free tier: 1000 requests/month, 45 req/min).
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
        if (response.ok) {
            const data = (await response.json()) as { countryCode?: string };
            return data.countryCode || null;
        }
    } catch (error) {
        console.warn("Failed to lookup IP geolocation:", error);
    }

    return null;
}

/**
 * Generates a unique participant ID
 */
function generateParticipantId(): string {
    return `participant_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Gets or creates participant map for a room
 */
function getRoomParticipants(roomId: string): Map<string, Participant> {
    if (!roomParticipants.has(roomId)) {
        roomParticipants.set(roomId, new Map());
    }
    const participants = roomParticipants.get(roomId);
    if (!participants) {
        throw new Error(`Room participants map not found for room: ${roomId}`);
    }
    return participants;
}

/**
 * Broadcasts participant joined message to all clients in a room
 */
function broadcastParticipantJoined(server: Bun.Server, roomId: string, participant: Participant) {
    const message = JSON.stringify({
        type: "participant_joined",
        payload: participant,
    });

    server.publish(getRoomTopic(roomId), message);
}

/**
 * Broadcasts participant left message to all clients in a room
 */
function broadcastParticipantLeft(server: Bun.Server, roomId: string, participantId: string) {
    const message = JSON.stringify({
        type: "participant_left",
        payload: { id: participantId },
    });

    server.publish(getRoomTopic(roomId), message);
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
 * Generates the pub/sub topic name for a room
 */
function getRoomTopic(roomId: string): string {
    return `room:${roomId}`;
}

/**
 * Safely parses a raw message into a validated WebSocketMessage object.
 * @param rawMessage The raw message from the WebSocket.
 * @returns A parsed message object or null if validation fails.
 */
function parseMessage(rawMessage: string | Buffer) {
    try {
        const json = JSON.parse(rawMessage.toString());
        return WebSocketMessageSchema.parse(json);
    } catch (error) {
        if (error instanceof ZodError) {
            console.error("Message validation failed:", error.errors);
        } else {
            console.error("Failed to parse message JSON:", error);
        }
        return null;
    }
}

console.log("Starting Bun WebSocket server...");

const server = Bun.serve({
    port,

    // This fetch handler is called for every HTTP request.
    // We use it to upgrade requests to WebSockets.
    async fetch(req, server) {
        // Extract room ID from the URL.
        const roomId = extractRoomId(req.url);

        if (!roomId || !isValidRoomId(roomId)) {
            return new Response("Invalid or missing room ID", { status: 400 });
        }

        const participantId = generateParticipantId();
        const clientIP = server.requestIP(req);
        const clientIPString = clientIP?.address ?? null;
        const userAgent = req.headers.get("User-Agent") || "Unknown";
        const country = await getCountryFromIP(req, clientIPString);

        // Create participant object.
        const participant: Participant = {
            id: participantId,
            country,
            userAgent,
            connectedAt: new Date().toISOString(),
        };

        // Attempt to upgrade the request to a WebSocket connection.
        // Pass the room ID, participant ID, and participant data.
        if (
            server.upgrade(req, {
                data: { roomId, participantId, participant },
            })
        ) {
            return; // Bun handles the response for successful upgrades.
        }
        return new Response("Upgrade failed :(", { status: 500 });
    },

    // This object defines the handlers for WebSocket events.
    // As the docs note, these are defined once per server for efficiency.
    websocket: {
        // This handler is called when a client connects.
        open(ws) {
            const parsedData = WebSocketConnectionSchema.safeParse(ws.data);

            if (!parsedData.success) {
                console.error("Invalid WebSocket connection data:", parsedData.error);
                ws.close(1008, "Invalid connection data");
                return;
            }

            const {
                data: { roomId, participantId, participant },
            } = parsedData;
            const roomTopic = getRoomTopic(roomId);

            // Add participant to room tracking.
            const participants = getRoomParticipants(roomId);
            participants.set(participantId, participant);

            // Subscribe to room topic.
            ws.subscribe(roomTopic);

            // Send current participant list to the new client.
            const participantArray = Array.from(participants.values());
            const participantListMessage = {
                type: "participant_list",
                payload: { participants: participantArray },
            };

            ws.send(JSON.stringify(participantListMessage));

            // Broadcast that a new participant joined to other clients.
            broadcastParticipantJoined(server, roomId, participant);
        },

        // This handler is called when a client sends a message.
        message(ws, message) {
            const parsedData = WebSocketConnectionSchema.safeParse(ws.data);

            if (!parsedData.success) {
                console.error("Invalid WebSocket connection data:", parsedData.error);
                ws.close(1008, "Invalid connection data");
                return;
            }

            const {
                data: { roomId },
            } = parsedData;
            const roomTopic = getRoomTopic(roomId);

            const parsedMessage = parseMessage(message);

            if (!parsedMessage) {
                console.warn(`Dropping invalid message in room ${roomId}: ${message.toString().substring(0, 80)}...`);
                return; // Ignore invalid messages
            }

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
            console.log(`Broadcasting message in room ${roomId}: ${message.toString().substring(0, 80)}...`);
            // We forward the original raw message to avoid re-serializing
            server.publish(roomTopic, message);
        },

        // This handler is called when a client disconnects.
        close(ws) {
            const parsedData = WebSocketConnectionSchema.safeParse(ws.data);

            if (parsedData.success) {
                const {
                    data: { roomId, participantId },
                } = parsedData;

                // Remove participant from room tracking
                const participants = getRoomParticipants(roomId);
                if (participants.has(participantId)) {
                    participants.delete(participantId);

                    // Broadcast that participant left to remaining clients
                    broadcastParticipantLeft(server, roomId, participantId);

                    // Clean up empty room maps
                    if (participants.size === 0) {
                        roomParticipants.delete(roomId);
                    }
                }
            }

            // If there was an error parsing the connection data, it doesn't really matter here.
        },
    },
});

console.log(`Bun server listening on http://${server.hostname}:${server.port}`);
