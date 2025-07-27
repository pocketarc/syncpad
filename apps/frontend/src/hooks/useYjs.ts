import type {
    ClientCrdtMessage,
    ClientMessage,
    ClientSyncRequestMessage,
    ClientSyncResponseMessage,
    Message,
} from "@syncpad/shared";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";

// Helper to convert Uint8Array to Base64
function uint8ArrayToBase64(array: Uint8Array): string {
    return window.btoa(array.reduce((data, byte) => data + String.fromCharCode(byte), ""));
}

// Helper to convert Base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isSynced, setIsSynced] = useState(false);
    const savedCursorPos = useRef<number | null>(null);

    // Reset sync status on disconnection
    useEffect(() => {
        if (!isConnected) {
            setIsSynced(false);
        }
    }, [isConnected]);

    // Save and restore cursor position on focus/blur
    useEffect(() => {
        const textarea = textareaRef.current;

        const handleBlur = () => {
            if (textarea) {
                console.log(`[Yjs] Textarea blurred. Saving cursor position: ${textarea.selectionStart}`);
                savedCursorPos.current = textarea.selectionStart;
            }
        };

        const handleFocus = () => {
            if (textarea && savedCursorPos.current !== null) {
                console.log(`[Yjs] Textarea focused. Restoring cursor to ${savedCursorPos.current}`);
                textarea.setSelectionRange(savedCursorPos.current, savedCursorPos.current);
                savedCursorPos.current = null; // Clear after restoring
            }
        };

        textarea?.addEventListener("blur", handleBlur);
        textarea?.addEventListener("focus", handleFocus);

        return () => {
            textarea?.removeEventListener("blur", handleBlur);
            textarea?.removeEventListener("focus", handleFocus);
        };
    }, []);

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
                    Y.applyUpdate(yDoc, base64ToUint8Array(decryptedPayload), "remote");
                    setIsSynced(true);
                } else if (lastMessage.type === "sync-request") {
                    const remoteStateVector = base64ToUint8Array(decryptedPayload);
                    const update = Y.encodeStateAsUpdate(yDoc, remoteStateVector);
                    const message: ClientSyncResponseMessage = {
                        type: "sync-response",
                        payload: uint8ArrayToBase64(update),
                    };
                    sendMessage(message);
                } else if (lastMessage.type === "sync-response") {
                    Y.applyUpdate(yDoc, base64ToUint8Array(decryptedPayload), "remote");
                    setIsSynced(true);
                }
            });
        }
    }, [lastMessage, decrypt, yDoc, sendMessage]);

    // Send a sync request when the connection is established but not yet synced.
    useEffect(() => {
        if (isConnected && !isSynced) {
            const stateVector = Y.encodeStateVector(yDoc);
            const message: ClientSyncRequestMessage = {
                type: "sync-request",
                payload: uint8ArrayToBase64(stateVector),
            };
            sendMessage(message);
        }
    }, [isConnected, isSynced, yDoc, sendMessage]);

    const handleTextChange = useCallback(
        (e: ChangeEvent<HTMLTextAreaElement>) => {
            const newText = e.target.value;
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
            }, "local");
        },
        [yDoc, yText],
    );

    return { text, handleTextChange, textareaRef };
}
