import type { Message, MessageWithoutId } from "@syncpad/shared";
import { useCallback, useEffect, useRef, useState } from "react";

type ConnectionStatus = "Connecting" | "Connected" | "Disconnected" | "Error" | "Reconnecting";

const PING_INTERVAL = 30000; // 30 seconds
const PONG_TIMEOUT = 5000; // 5 seconds to wait for pong
const RECONNECT_DELAY_BASE = 1000; // Base delay for exponential backoff
const MAX_RECONNECT_DELAY = 30000; // Maximum delay between reconnection attempts
const MAX_RECONNECT_ATTEMPTS = Number.POSITIVE_INFINITY; // Reconnect infinitely

export function useScratchpadSocket(url: string | null) {
    const [status, setStatus] = useState<ConnectionStatus>("Connecting");
    const [lastMessage, setLastMessage] = useState<Message | null>(null);
    const ws = useRef<WebSocket | null>(null);
    const pingInterval = useRef<NodeJS.Timeout | null>(null);
    const pongTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const shouldReconnect = useRef(true);
    const sentMessageIds = useRef<Set<string>>(new Set());
    const receivedMessageIds = useRef<Set<string>>(new Set());

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

    const sendMessage = useCallback((message: MessageWithoutId) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            // Generate a unique message ID and track it.
            const messageId = crypto.randomUUID();
            const messageWithId = {
                ...message,
                messageId,
            };

            if (!["ping", "pong"].includes(messageWithId.type)) {
                // Track this message ID so we can ignore it when it comes back.
                // We don't track ping/pong messages since they are not sent by the user.
                sentMessageIds.current.add(messageId);

                // Clean up old message IDs to prevent memory leaks.
                if (sentMessageIds.current.size > 100) {
                    const ids = Array.from(sentMessageIds.current);
                    sentMessageIds.current.clear();
                    ids.slice(-50).forEach((id) => sentMessageIds.current.add(id));
                }
            }

            ws.current.send(JSON.stringify(messageWithId));
        } else {
            console.error("WebSocket is not connected. Current state:", ws.current?.readyState);
        }
    }, []);

    const sendPing = useCallback(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            sendMessage({ type: "ping", payload: null });

            // Set timeout to wait for pong
            pongTimeout.current = setTimeout(() => {
                console.log("Pong timeout - connection appears dead, closing socket");
                ws.current?.close();
            }, PONG_TIMEOUT);
        }
    }, [sendMessage]);

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
                const delay = Math.min(RECONNECT_DELAY_BASE * 2 ** reconnectAttempts.current, MAX_RECONNECT_DELAY);

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
                const message: Message = JSON.parse(event.data);

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
                    sendMessage({ type: "pong", payload: null });
                    return;
                }

                // Ignore messages we sent ourselves.
                if (message.messageId && sentMessageIds.current.has(message.messageId)) {
                    return;
                }

                // **Replay Attack Prevention**
                // If we have seen this message ID before, discard it.
                if (message.messageId && receivedMessageIds.current.has(message.messageId)) {
                    console.warn("Replay attack detected. Discarding message:", message.messageId);
                    return;
                }

                // Track the new message ID.
                if (message.messageId) {
                    receivedMessageIds.current.add(message.messageId);

                    // Clean up old received message IDs to prevent memory leaks.
                    if (receivedMessageIds.current.size > 100) {
                        const ids = Array.from(receivedMessageIds.current);
                        receivedMessageIds.current.clear();
                        ids.slice(-50).forEach((id) => receivedMessageIds.current.add(id));
                    }
                }

                setLastMessage(message);
            } catch (error) {
                console.error("Failed to parse incoming message:", error);
            }
        };
    }, [url, startPingInterval, sendMessage, clearTimers]);

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
    }, [connect, clearTimers]);

    return { status, lastMessage, sendMessage };
}
