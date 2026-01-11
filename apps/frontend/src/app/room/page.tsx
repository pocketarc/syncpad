"use client";

import type { ClientFileMessage, ClientMessage, ClientTextMessage, Message } from "@syncpad/shared";
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
import { generateId, getPublicId, isE2EE } from "@/lib/crypto.ts";
import { downloadFile } from "@/lib/downloadFile";

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function RoomPage() {
    const router = useRouter();
    const [secret, setSecret] = useState<string | null>(null);
    const [publicId, setPublicId] = useState<string | null>(null);

    const port = Number.parseInt(process.env["NEXT_PUBLIC_WEBSOCKET_PORT"] ?? "8080");
    const hostname = useHostname();

    // On OrbStack domains, route to the API subdomain; otherwise use hostname:port.
    const defaultWebSocketUrl = hostname.endsWith(".orb.local")
        ? "ws://api.syncpad.orb.local"
        : `ws://${hostname}:${port}`;

    const websocketUrl = process.env["NEXT_PUBLIC_WEBSOCKET_URI"] ?? defaultWebSocketUrl;

    const [text, setText] = useState("");
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
                const encryptedPayload = await encrypt(JSON.stringify(message.payload));
                const encryptedMessage: Message = {
                    type: message.type,
                    payload: encryptedPayload,
                    messageId: generateId(),
                };
                sendRawMessage(encryptedMessage);
            } catch (error) {
                console.error("Failed to encrypt and send message:", error);
            }
        },
        [isCryptoReady, encrypt, sendRawMessage],
    );

    // Effect to handle incoming messages from the WebSocket.
    useEffect(() => {
        if (lastMessage && isCryptoReady) {
            // The entire payload is now an encrypted string. We must decrypt it first.
            decrypt(lastMessage.payload as string)
                .then((decryptedPayload) => {
                    setError(null); // Clear any previous error
                    const payload = JSON.parse(decryptedPayload);
                    if (lastMessage.type === "text") {
                        setText(payload);
                    } else if (lastMessage.type === "file") {
                        downloadFile(payload);
                    }
                })
                .catch(() => {
                    // Do not log the specific error to the console.
                    // Set a user-facing error state instead.
                    setError("Could not decrypt an incoming message. The sender may be using a different room secret.");
                });
        }
    }, [lastMessage, isCryptoReady, decrypt]);

    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newText = e.target.value;
            setText(newText);
            const message: ClientTextMessage = { type: "text", payload: newText };
            sendMessage(message);
        },
        [sendMessage],
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
                // The URL to share is the one with the secret in the fragment.
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
        <div className="flex min-h-screen flex-col">
            <main className="flex flex-col items-center p-4 flex-1">
                <div className="w-full max-w-4xl">
                    <Header buttons={button}>
                        {secret && (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                Room: <strong data-testid="roomid">{secret}</strong>
                            </p>
                        )}
                    </Header>

                    <StatusBar status={status} error={error} isEncrypted={isE2EE()} />

                    <FileDropZone onFileDrop={handleFileDrop} disabled={!isConnected}>
                        <ScratchpadInput value={text} onChange={handleTextChange} disabled={!isConnected} />
                    </FileDropZone>
                </div>
            </main>

            <Footer />
        </div>
    );
}
