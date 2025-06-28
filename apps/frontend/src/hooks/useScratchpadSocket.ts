import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@/lib/types";

type ConnectionStatus = "Connecting" | "Connected" | "Disconnected" | "Error";

export function useScratchpadSocket(url: string | null) {
    const [status, setStatus] = useState<ConnectionStatus>("Connecting");
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!url) {
            setStatus("Disconnected");
            return;
        }

        const socket = new WebSocket(url);
        ws.current = socket;

        socket.onopen = () => setStatus("Connected");
        socket.onclose = () => setStatus("Disconnected");
        socket.onerror = () => setStatus("Error");

        socket.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                setLastMessage(message);
            } catch (error) {
                console.error("Failed to parse incoming message:", error);
            }
        };

        // Cleanup on unmount
        return () => {
            socket.close();
        };
    }, [url]); // Reconnect if the URL changes

    const sendMessage = (message: WebSocketMessage) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not connected.");
        }
    };

    return { status, lastMessage, sendMessage };
}
