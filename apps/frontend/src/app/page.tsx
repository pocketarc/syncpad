"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { FileDropZone } from "@/components/FileDropZone";
import { ScratchpadInput } from "@/components/ScratchpadInput";
import { StatusBar } from "@/components/StatusBar";
import { useHostname } from "@/hooks/useHostname";
import { useScratchpadSocket } from "@/hooks/useScratchpadSocket";
import { useDarkMode } from "@/hooks/useDarkMode";
import { downloadFile } from "@/lib/downloadFile";
import type { TextMessage } from "@/lib/types";

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function Page() {
    const port = Number.parseInt(process.env["NEXT_PUBLIC_WEBSOCKET_PORT"] ?? "3001");
    const hostname = useHostname();
    const { isDark, toggleDarkMode } = useDarkMode();

    const [text, setText] = useState("");
    const { status, lastMessage, sendMessage } = useScratchpadSocket(hostname ? `ws://${hostname}:${port}` : null);
    const isConnected = status === "Connected";

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

    return (
        <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-200">
            <div className="w-full max-w-4xl">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.png" alt="SyncPad Logo" width={48} height={48} className="drop-shadow-sm" />
                        <div>
                            <h1 className="text-3xl font-bold text-orange-800 dark:text-orange-300">SyncPad</h1>
                            <p className="text-sm text-orange-600 dark:text-orange-400">Instant cross-device synchronization</p>
                        </div>
                    </div>
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-orange-200 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? "☀️" : "🌙"}
                    </button>
                </div>

                <StatusBar status={status} />

                <FileDropZone onFileDrop={handleFileDrop} disabled={!isConnected}>
                    <ScratchpadInput value={text} onChange={handleTextChange} disabled={!isConnected} />
                </FileDropZone>
            </div>
        </main>
    );
}
