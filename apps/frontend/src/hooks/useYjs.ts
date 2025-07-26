import type { ClientCrdtMessage, ClientMessage, ClientSyncRequestMessage, ClientSyncResponseMessage, Message } from "@syncpad/shared";
import { useCallback, useEffect, useState } from "react";
import * as Y from "yjs";

// Helper to convert Uint8Array to Base64
function uint8ArrayToBase64(array: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < array.length; i++) {
        binary += String.fromCharCode(array[i]);
    }
    return window.btoa(binary);
}

// Helper to convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

interface UseYjsProps {
    sendMessage: (message: ClientMessage) => Promise<void>;
    lastMessage: Message | null;
    isConnected: boolean;
    decrypt: (data: string) => Promise<string>;
}

export function useYjs({ sendMessage, lastMessage, isConnected, decrypt }: UseYjsProps) {
    const [yDoc] = useState(() => new Y.Doc());
    const [yText] = useState(() => yDoc.getText("scratchpad"));
    const [text, setText] = useState("");

    // Set up Yjs observers for local and remote changes
    useEffect(() => {
        const onTextChange = () => {
            setText(yText.toString());
        };

        const onDocUpdate = (update: Uint8Array, origin: unknown) => {
            if (origin !== "remote") {
                const message: ClientCrdtMessage = {
                    type: "crdt",
                    payload: uint8ArrayToBase64(update),
                };
                sendMessage(message);
            }
        };

        yText.observe(onTextChange);
        yDoc.on("update", onDocUpdate);

        return () => {
            yText.unobserve(onTextChange);
            yDoc.off("update", onDocUpdate);
        };
    }, [yDoc, yText, sendMessage]);

    // Handle incoming messages
    useEffect(() => {
        if (lastMessage) {
            decrypt(lastMessage.payload as string).then((decryptedPayload) => {
                if (lastMessage.type === "crdt") {
                    const update = base64ToUint8Array(decryptedPayload);
                    Y.applyUpdate(yDoc, update, "remote");
                } else if (lastMessage.type === "sync-request") {
                    const remoteStateVector = base64ToUint8Array(decryptedPayload);
                    const update = Y.encodeStateAsUpdate(yDoc, remoteStateVector);
                    const message: ClientSyncResponseMessage = {
                        type: "sync-response",
                        payload: uint8ArrayToBase64(update),
                    };
                    sendMessage(message);
                } else if (lastMessage.type === "sync-response") {
                    const update = base64ToUint8Array(decryptedPayload);
                    Y.applyUpdate(yDoc, update, "remote");
                }
            });
        }
    }, [lastMessage, decrypt, yDoc, sendMessage]);

    // Send a sync request when the connection is established.
    useEffect(() => {
        if (isConnected) {
            const stateVector = Y.encodeStateVector(yDoc);
            const message: ClientSyncRequestMessage = {
                type: "sync-request",
                payload: uint8ArrayToBase64(stateVector),
            };
            sendMessage(message);
        }
    }, [isConnected, yDoc, sendMessage]);

    const handleLocalTextChange = useCallback(
        (newText: string) => {
            const oldText = yText.toString();
            yDoc.transact(() => {
                const minLen = Math.min(oldText.length, newText.length);
                let start = 0;
                while (start < minLen && oldText[start] === newText[start]) {
                    start++;
                }

                let oldEnd = oldText.length;
                let newEnd = newText.length;
                while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
                    oldEnd--;
                    newEnd--;
                }

                if (oldEnd > start) {
                    yText.delete(start, oldEnd - start);
                }
                if (newEnd > start) {
                    yText.insert(start, newText.slice(start, newEnd));
                }
            });
        },
        [yDoc, yText],
    );

    return { text, handleLocalTextChange };
}