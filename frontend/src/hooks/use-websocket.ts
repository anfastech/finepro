import { useEffect, useRef, useState, useCallback } from "react";
import { WS_URL } from "@/config";
import { api } from "@/lib/api";


export enum MessageType {
    MESSAGE = "message",
    USER_JOINED = "user_joined",
    USER_LEFT = "user_left",
    USER_TYPING = "user_typing",
    NOTIFICATION = "notification",
    ERROR = "error",
    PRESENCE_UPDATE = "presence_update",
}

interface WSMessage {
    type: string;
    data: any;
    timestamp?: string;
    room_id?: string;
    user_id?: string;
}

export const useWebSocket = (workspaceId?: string) => {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(async () => {
        if (!workspaceId) return;

        // Get token using our bridge
        // We can't really "await" inside useEffect comfortably, so we handle it here
        const fetchAndConnect = async () => {
            try {
                // Get Supabase session
                const response = await fetch("/api/auth/session");
                if (!response.ok) throw new Error("Failed to get session");
                const { access_token } = await response.json();

                const ws = new WebSocket(`${WS_URL}/connect/${access_token}`);

                ws.onopen = () => {
                    console.log("WebSocket Connected");
                    setIsConnected(true);

                    // Send initialization message
                    ws.send(JSON.stringify({
                        workspace_id: workspaceId,
                        user_info: {} // Optional: add additional info if needed
                    }));
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    setLastMessage(data);
                };

                ws.onclose = () => {
                    console.log("WebSocket Disconnected");
                    setIsConnected(false);
                    // Simple reconnect
                    reconnectTimeoutRef.current = setTimeout(connect, 5000);
                };

                ws.onerror = (error) => {
                    console.error("WebSocket Error:", error);
                    ws.close();
                };

                socketRef.current = ws;
            } catch (err) {
                console.error("WS Connection Setup Failed", err);
                reconnectTimeoutRef.current = setTimeout(connect, 10000);
            }
        };

        fetchAndConnect();
    }, [workspaceId]);

    useEffect(() => {
        connect();
        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    const sendMessage = useCallback((type: string, data: any, roomId?: string) => {
        if (socketRef.current && isConnected) {
            socketRef.current.send(JSON.stringify({
                type,
                data,
                room_id: roomId,
            }));
        }
    }, [isConnected]);

    const joinRoom = useCallback((roomId: string, roomType: "project" | "task" | "workspace") => {
        sendMessage("join_room", { room_id: roomId, room_type: roomType });
    }, [sendMessage]);

    const leaveRoom = useCallback((roomId: string) => {
        sendMessage("leave_room", { room_id: roomId });
    }, [sendMessage]);

    const setTyping = useCallback((roomId: string, isTyping: boolean) => {
        sendMessage("typing", { room_id: roomId, is_typing: isTyping });
    }, [sendMessage]);

    return {
        isConnected,
        lastMessage,
        sendMessage,
        joinRoom,
        leaveRoom,
        setTyping,
    };
};
