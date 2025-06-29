"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { FileDropZone } from "@/components/FileDropZone";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ScratchpadInput } from "@/components/ScratchpadInput";
import { StatusBar } from "@/components/StatusBar";
import { useHostname } from "@/hooks/useHostname";
import { useScratchpadSocket } from "@/hooks/useScratchpadSocket";
import { downloadFile } from "@/lib/downloadFile";
import { isValidRoomId } from "@/lib/roomId";
import type { TextMessage } from "@/lib/types";

interface RoomPageProps {
    params: Promise<{ roomId: string }>;
}

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function RoomPage({ params }: RoomPageProps) {
    const [roomId, setRoomId] = useState<string | null>(null);

    useEffect(() => {
        params.then(({ roomId }) => {
            setRoomId(roomId);
        });
    }, [params]);

    const port = Number.parseInt(process.env["NEXT_PUBLIC_WEBSOCKET_PORT"] ?? "3001");
    const hostname = useHostname();

    const [text, setText] = useState("");
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");

    // Construct WebSocket URL with room ID path
    const wsUrl = hostname && roomId && isValidRoomId(roomId) ? `ws://${hostname}:${port}/${roomId}` : null;

    const { status, lastMessage, sendMessage } = useScratchpadSocket(wsUrl);
    const isConnected = status === "Connected";

    // Redirect to home if room ID is invalid
    useEffect(() => {
        if (roomId && !isValidRoomId(roomId)) {
            window.location.href = "/";
        }
    }, [roomId]);

    // Effect to handle incoming messages from the WebSocket.
    useEffect(() => {
        if (lastMessage) {
            if (lastMessage.type === "text") {
                setText(lastMessage.payload);
            } else if (lastMessage.type === "file") {
                downloadFile(lastMessage.payload);
            }
        }
    }, [lastMessage]); // This effect runs only when a new message arrives.

    const handleTextChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newText = e.target.value;
            setText(newText);
            const message: TextMessage = { type: "text", payload: newText };
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
                        sendMessage({
                            type: "file",
                            payload: {
                                name: file.name,
                                type: file.type,
                                data: e.target.result as string,
                            },
                        });
                    }
                };
                reader.readAsDataURL(file);
            }
        },
        [sendMessage],
    );

    const handleCopyRoomUrl = useCallback(async () => {
        if (typeof window !== "undefined" && roomId) {
            try {
                const roomUrl = `${window.location.origin}/${roomId}`;
                await navigator.clipboard.writeText(roomUrl);
                setCopyStatus("copied");
                setTimeout(() => setCopyStatus("idle"), 2000);
            } catch (_error) {
                setCopyStatus("error");
                setTimeout(() => setCopyStatus("idle"), 2000);
            }
        }
    }, [roomId]);

    const button = (
        <button
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
                        {roomId && (
                            <p className="text-sm text-orange-600 dark:text-orange-400">
                                Room: <strong>{roomId}</strong>
                            </p>
                        )}
                    </Header>

                    <StatusBar status={status} />

                    <FileDropZone onFileDrop={handleFileDrop} disabled={!isConnected}>
                        <ScratchpadInput value={text} onChange={handleTextChange} disabled={!isConnected} />
                    </FileDropZone>
                </div>
            </main>

            <Footer />
        </div>
    );
}
