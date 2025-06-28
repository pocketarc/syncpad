export type TextMessage = {
    type: "text";
    payload: string;
};

export type FileMessagePayload = {
    name: string;
    type: string; // MIME type
    data: string; // Base64 encoded file data
};

export type FileMessage = {
    type: "file";
    payload: FileMessagePayload;
};

export type WebSocketMessage = TextMessage | FileMessage;
