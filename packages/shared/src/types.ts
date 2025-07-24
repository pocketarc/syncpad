import { z } from "zod";

export const TextMessageSchema = z.object({
    type: z.literal("text"),
    payload: z.string(),
    messageId: z.string().optional(),
});

export const FileMessagePayloadSchema = z.object({
    name: z.string(),
    type: z.string(), // MIME type
    data: z.string(), // Base64 encoded file data
});

export const FileMessageSchema = z.object({
    type: z.literal("file"),
    payload: FileMessagePayloadSchema,
    messageId: z.string().optional(),
});

export const PingMessageSchema = z.object({
    type: z.literal("ping"),
    payload: z.null(),
});

export const PongMessageSchema = z.object({
    type: z.literal("pong"),
    payload: z.null(),
});

export const WebSocketMessageSchema = z.discriminatedUnion("type", [
    TextMessageSchema,
    FileMessageSchema,
    PingMessageSchema,
    PongMessageSchema,
]);

export const WebSocketConnectionSchema = z.object({
    roomId: z.string(),
});

export type TextMessage = z.infer<typeof TextMessageSchema>;
export type FileMessagePayload = z.infer<typeof FileMessagePayloadSchema>;
export type FileMessage = z.infer<typeof FileMessageSchema>;
export type PingMessage = z.infer<typeof PingMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
export type WebSocketConnection = z.infer<typeof WebSocketConnectionSchema>;
