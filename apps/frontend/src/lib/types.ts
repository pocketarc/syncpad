export type TextMessage = {
    type: "text";
    payload: string;
    messageId?: string;
};

export type FileMessagePayload = {
    name: string;
    type: string; // MIME type
    data: string; // Base64 encoded file data
};

export type FileMessage = {
    type: "file";
    payload: FileMessagePayload;
    messageId?: string;
};

export type PingMessage = {
    type: "ping";
    payload: null;
};

export type PongMessage = {
    type: "pong";
    payload: null;
};

export type WebSocketMessage = TextMessage | FileMessage | PingMessage | PongMessage;
