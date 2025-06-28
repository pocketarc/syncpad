import { useCallback, useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "@/lib/types";

type ConnectionStatus = "Connecting" | "Connected" | "Disconnected" | "Error" | "Reconnecting";

const PING_INTERVAL = 30000; // 30 seconds
const PONG_TIMEOUT = 5000; // 5 seconds to wait for pong
const RECONNECT_DELAY_BASE = 1000; // Base delay for exponential backoff
const MAX_RECONNECT_DELAY = 30000; // Maximum delay between reconnection attempts
const MAX_RECONNECT_ATTEMPTS = Infinity; // Reconnect infinitely

export function useScratchpadSocket(url: string | null) {
    const [status, setStatus] = useState<ConnectionStatus>("Connecting");
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<NodeJS.Timeout | null>(null);
    const pongTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const shouldReconnect = useRef(true);

    const clearTimers = useCallback(() => {
        if (pingInterval.current) {
            clearInterval(pingInterval.current);
            pingInterval.current = null;
        }
        if (pongTimeout.current) {
            clearTimeout(pongTimeout.current);
            pongTimeout.current = null;
        }
        if (reconnectTimeout.current) {
            clearTimeout(reconnectTimeout.current);
            reconnectTimeout.current = null;
        }
    }, []);

    const sendPing = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: "ping", payload: null }));
            
            // Set timeout to wait for pong
            pongTimeout.current = setTimeout(() => {
                console.log("Pong timeout - connection appears dead, closing socket");
                ws.current?.close();
            }, PONG_TIMEOUT);
        }
    }, []);

    const startPingInterval = useCallback(() => {
        clearTimers();
        pingInterval.current = setInterval(sendPing, PING_INTERVAL);
    }, [sendPing, clearTimers]);

    const connect = useCallback(() => {
        if (!url || !shouldReconnect.current) {
            setStatus("Disconnected");
            return;
        }

        console.log(`Connecting to WebSocket... (attempt ${reconnectAttempts.current + 1})`);
        setStatus(reconnectAttempts.current === 0 ? "Connecting" : "Reconnecting");

        const socket = new WebSocket(url);
        ws.current = socket;

        socket.onopen = () => {
            console.log("WebSocket connected");
            setStatus("Connected");
            reconnectAttempts.current = 0;
            startPingInterval();
        };

        socket.onclose = (event) => {
            console.log("WebSocket closed", { code: event.code, reason: event.reason });
            clearTimers();
            
            if (shouldReconnect.current && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
                setStatus("Reconnecting");
                const delay = Math.min(
                    RECONNECT_DELAY_BASE * Math.pow(2, reconnectAttempts.current),
                    MAX_RECONNECT_DELAY
                );
                
                console.log(`Reconnecting in ${delay}ms...`);
                reconnectTimeout.current = setTimeout(() => {
                    reconnectAttempts.current++;
                    connect();
                }, delay);
            } else {
                setStatus("Disconnected");
            }
        };

        socket.onerror = (error) => {
            console.error("WebSocket error:", error);
            setStatus("Error");
        };

        socket.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                
                // Handle pong response
                if (message.type === "pong") {
                    if (pongTimeout.current) {
                        clearTimeout(pongTimeout.current);
                        pongTimeout.current = null;
                    }
                    return;
                }
                
                // Handle ping (respond with pong)
                if (message.type === "ping") {
                    if (socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({ type: "pong", payload: null }));
                    }
                    return;
                }
                
                // Handle other message types
                setLastMessage(message);
            } catch (error) {
                console.error("Failed to parse incoming message:", error);
            }
        };
    }, [url, startPingInterval, clearTimers]);

    useEffect(() => {
        shouldReconnect.current = true;
        reconnectAttempts.current = 0;
        connect();

        // Cleanup on unmount
        return () => {
            shouldReconnect.current = false;
            clearTimers();
            if (ws.current) {
                ws.current.close();
                ws.current = null;
            }
        };
    }, [url, connect, clearTimers]);

    const sendMessage = useCallback((message: WebSocketMessage) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not connected. Current state:", ws.current?.readyState);
        }
    }, []);

    return { status, lastMessage, sendMessage };
}
