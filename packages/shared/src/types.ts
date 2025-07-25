// The message structure that is sent over the WebSocket.
// The payload is an encrypted string for text and file types.
// For ping/pong, the payload is not used.
import { z } from "zod";

export interface MessageWithoutId {
    type: "text" | "file" | "ping" | "pong";
    payload: string | null;
}

export interface Message {
    type: "text" | "file" | "ping" | "pong";
    payload: string | null;
    messageId: string;
}

// The unencrypted payload for a file message.
export interface FilePayload {
    name: string;
    type: string; // MIME type
    data: string; // Base64 encoded file data
}

// The unencrypted payload for a text message is simply a string.
export type TextPayload = string;

// --- Client-side convenience types (before encryption) ---

export interface ClientTextMessage {
    type: "text";
    payload: TextPayload;
}

export interface ClientFileMessage {
    type: "file";
    payload: FilePayload;
}

export type ClientMessage = ClientTextMessage | ClientFileMessage;

export const MessageSchema = z.object({
    type: z.enum(["text", "file", "ping", "pong"]),
    payload: z.string().nullable(),
    messageId: z.string(),
});
