// The message structure that is sent over the WebSocket.
// The payload is an encrypted string for text and file types.
// For ping/pong, the payload is not used.
import { z } from "zod";

export type MessageType = "text" | "file" | "ping" | "pong" | "crdt" | "sync-request" | "sync-response";

export interface MessageWithoutId {
    type: MessageType;
    payload: string | null;
}

export interface Message {
    type: MessageType;
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

// The unencrypted payload for a CRDT message is a Base64-encoded string.
export type CrdtPayload = string;

// The unencrypted payload for sync messages is a Base64-encoded string.
export type SyncPayload = string;

// --- Client-side convenience types (before encryption) ---

export interface ClientTextMessage {
    type: "text";
    payload: TextPayload;
}

export interface ClientFileMessage {
    type: "file";
    payload: FilePayload;
}

export interface ClientCrdtMessage {
    type: "crdt";
    payload: CrdtPayload;
}

export interface ClientSyncRequestMessage {
    type: "sync-request";
    payload: SyncPayload;
}

export interface ClientSyncResponseMessage {
    type: "sync-response";
    payload: SyncPayload;
}

export type ClientMessage =
    | ClientTextMessage
    | ClientFileMessage
    | ClientCrdtMessage
    | ClientSyncRequestMessage
    | ClientSyncResponseMessage;

export const MessageSchema = z.object({
    type: z.enum(["text", "file", "ping", "pong", "crdt", "sync-request", "sync-response"]),
    payload: z.string().nullable(),
    messageId: z.string(),
});
