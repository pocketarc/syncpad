"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { FileDropZone } from "@/components/FileDropZone";
import { ScratchpadInput } from "@/components/ScratchpadInput";
import { StatusBar } from "@/components/StatusBar";
import { useScratchpadSocket } from "@/hooks/useScratchpadSocket";
import { downloadFile } from "@/lib/downloadFile";
import type { TextMessage } from "@/lib/types";
import { useHostname } from "@/hooks/useHostname";

// biome-ignore lint/style/noDefaultExport: Next.js requires a default export for pages.
export default function Page() {
    const port = Number.parseInt(process.env["NEXT_PUBLIC_WEBSOCKET_PORT"] ?? "3001");
    const hostname = useHostname();

    const [text, setText] = useState("");
    const { status, lastMessage, sendMessage } = useScratchpadSocket(hostname ? `ws://${hostname}:${port}` : null);

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
        <main className="flex min-h-screen flex-col items-center p-4">
            <div className="w-full max-w-4xl">
                <h1 className="text-2xl font-bold mb-2">Synced Scratchpad</h1>
                <StatusBar status={status} />

                <FileDropZone onFileDrop={handleFileDrop}>
                    <ScratchpadInput value={text} onChange={handleTextChange} />
                </FileDropZone>
            </div>
        </main>
    );
}
