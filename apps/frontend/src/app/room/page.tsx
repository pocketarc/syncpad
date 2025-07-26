"use client";

import type { ClientFileMessage, ClientMessage, Message } from "@syncpad/shared";
import { useRouter } from "next/navigation";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { FileDropZone } from "@/components/FileDropZone";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ScratchpadInput } from "@/components/ScratchpadInput";
import { StatusBar } from "@/components/StatusBar";
import { useCrypto } from "@/hooks/useCrypto";
import { useHostname } from "@/hooks/useHostname";
import { useScratchpadSocket } from "@/hooks/useScratchpadSocket";
import { useYjs } from "@/hooks/useYjs";
import { downloadFile } from "@/lib/downloadFile";

/**
 * Calculates a public room ID from a secret using SHA-256.
 * This is a one-way process, so the secret cannot be derived from the public ID.
 * @param secret The secret string from the URL fragment.
 * @returns A promise that resolves to a hex-encoded SHA-256 hash.
 */
async function getPublicId(secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function RoomPage() {
    const router = useRouter();
    const [secret, setSecret] = useState<string | null>(null);
    const [publicId, setPublicId] = useState<string | null>(null);

    const port = Number.parseInt(process.env["NEXT_PUBLIC_WEBSOCKET_PORT"] ?? "8080");
    const hostname = useHostname();
    const defaultWebSocketUrl = `ws://${hostname}:${port}`;
    const websocketUrl = process.env["NEXT_PUBLIC_WEBSOCKET_URI"] ?? defaultWebSocketUrl;

    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
    const [error, setError] = useState<string | null>(null);

    // On component mount, extract the secret from the URL fragment.
    useEffect(() => {
        if (typeof window !== "undefined") {
            const hash = window.location.hash;
            if (hash) {
                const currentSecret = hash.substring(1);
                setSecret(currentSecret);
                getPublicId(currentSecret).then(setPublicId);
            } else {
                // If there's no secret, we can't proceed. Redirect home.
                router.push("/");
            }
        }
    }, [router]);

    const { isReady: isCryptoReady, encrypt, decrypt } = useCrypto(secret);

    // Construct WebSocket URL with the derived public ID
    const wsUrl = hostname && publicId ? `${websocketUrl}/${publicId}` : null;

    const { status, lastMessage, sendMessage: sendRawMessage } = useScratchpadSocket(wsUrl);
    const isConnected = status === "Connected" && isCryptoReady;

    // Wrapper for sendMessage to encrypt the payload before sending.
    const sendMessage = useCallback(
        async (message: ClientMessage) => {
            if (!isCryptoReady) {
                return;
            }

            try {
                const payloadString = typeof message.payload === "string" ? message.payload : JSON.stringify(message.payload);
                const encryptedPayload = await encrypt(payloadString);
                const encryptedMessage: Message = {
                    type: message.type,
                    payload: encryptedPayload,
                    messageId: crypto.randomUUID(),
                };
                sendRawMessage(encryptedMessage);
            } catch (error) {
                console.error("Failed to encrypt and send message:", error);
            }
        },
        [isCryptoReady, encrypt, sendRawMessage],
    );

    const { text, handleLocalTextChange } = useYjs({
        sendMessage,
        lastMessage,
        isConnected,
        decrypt,
    });

    // Effect to handle incoming messages from the WebSocket.
    useEffect(() => {
        if (lastMessage && isCryptoReady) {
            decrypt(lastMessage.payload as string)
                .then((decryptedPayload) => {
                    setError(null);
                    if (lastMessage.type === "file") {
                        const payload = JSON.parse(decryptedPayload);
                        downloadFile(payload);
                    }
                })
                .catch(() => {
                    setError(
                        "Could not decrypt an incoming message. The sender may be using a different room secret.",
                    );
                });
        }
    }, [lastMessage, isCryptoReady, decrypt]);

    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            handleLocalTextChange(e.target.value);
        },
        [handleLocalTextChange],
    );

    const handleFileDrop = useCallback(
        (files: File[]) => {
            for (const file of files) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (e.target?.result) {
                        const message: ClientFileMessage = {
                            type: "file",
                            payload: {
                                name: file.name,
                                type: file.type,
                                data: e.target.result as string,
                            },
                        };
                        sendMessage(message);
                    }
                };
                reader.readAsDataURL(file);
            }
        },
        [sendMessage],
    );

    const handleCopyRoomUrl = useCallback(async () => {
        if (typeof window !== "undefined" && secret) {
            try {
                const roomUrl = `${window.location.origin}/room#${secret}`;
                await navigator.clipboard.writeText(roomUrl);
                setCopyStatus("copied");
                setTimeout(() => setCopyStatus("idle"), 2000);
            } catch (_error) {
                setCopyStatus("error");
                setTimeout(() => setCopyStatus("idle"), 2000);
            }
        }
    }, [secret]);

    const button = (
        <button
            name="share-room-button"
            type="button"
            onClick={handleCopyRoomUrl}
            className="px-3 py-2 text-sm bg-white dark:bg-stone-800 border border-orange-200 dark:border-stone-600 hover:bg-orange-50 dark:hover:bg-stone-700 transition-colors duration-200 rounded-lg text-orange-800 dark:text-orange-300 cursor-pointer"
            title="Copy room URL to clipboard"
            disabled={copyStatus !== "idle"}
        >
            {copyStatus === "copied" ? "✅ Copied!" : copyStatus === "error" ? "❌ Failed" : "📋 Share Room"}
        </button>
    );

    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-stone-900 dark:to-stone-800 transition-colors duration-200">
            <main className="flex flex-col items-center p-4 flex-1">
                <div className="w-full max-w-4xl">
                    <Header buttons={button}>
                        {secret && (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                Room: <strong data-testid="roomid">{secret}</strong>
                            </p>
                        )}
                    </Header>

                    <StatusBar status={status} error={error} />

                    <FileDropZone onFileDrop={handleFileDrop} disabled={!isConnected}>
                        <ScratchpadInput value={text} onChange={handleTextChange} disabled={!isConnected} />
                    </FileDropZone>
                </div>
            </main>

            <Footer />
        </div>
    );
}
