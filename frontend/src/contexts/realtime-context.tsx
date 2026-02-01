"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    useRef,
    ReactNode,
} from "react";
import { WS_URL } from "@/config";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type PresenceStatus = "online" | "idle" | "away" | "offline" | "busy";

export interface PresenceUser {
    userId: string;
    name: string;
    email?: string;
    avatarColor?: string;
    status: PresenceStatus;
    location?: {
        workspaceId?: string;
        projectId?: string;
        taskId?: string;
    };
    lastSeen: Date;
    isTyping?: boolean;
}

export interface Notification {
    id: string;
    type:
    | "task_assigned"
    | "task_due_soon"
    | "task_overdue"
    | "task_completed"
    | "comment_added"
    | "mention"
    | "project_update"
    | "sprint_update"
    | "system";
    title: string;
    message: string;
    priority: "critical" | "high" | "medium" | "low";
    read: boolean;
    createdAt: Date;
    entityId?: string;
    entityType?: "task" | "project" | "sprint" | "workspace";
    actorId?: string;
    actorName?: string;
}

export interface ActivityItem {
    id: string;
    type: string;
    action: string;
    entityType: "task" | "project" | "epic" | "sprint" | "workspace";
    entityId: string;
    entityName: string;
    workspaceId?: string;
    userId: string;
    userName: string;
    details?: Record<string, unknown>;
    timestamp: Date;
}

export interface TypingIndicator {
    userId: string;
    userName: string;
    roomId: string;
    roomType: "task" | "project";
    timestamp: Date;
}

// Message types from WebSocket
export enum WSMessageType {
    // Connection
    CONNECTED = "connected",
    ERROR = "error",

    // Presence
    PRESENCE_UPDATE = "presence_update",
    PRESENCE_LIST = "presence_list",
    USER_JOINED = "user_joined",
    USER_LEFT = "user_left",

    // Real-time updates
    TASK_CREATED = "task_created",
    TASK_UPDATED = "task_updated",
    TASK_DELETED = "task_deleted",
    TASK_ASSIGNED = "task_assigned",

    // Collaboration
    USER_TYPING = "user_typing",
    USER_VIEWING = "user_viewing",
    USER_EDITING = "user_editing",

    // Notifications
    NOTIFICATION = "notification",

    // Activity
    ACTIVITY = "activity",
}

interface WSMessage {
    type: WSMessageType | string;
    data: unknown;
    timestamp?: string;
    room_id?: string;
    user_id?: string;
}

// ============================================================================
// Context Definition
// ============================================================================

interface RealtimeContextValue {
    // Connection state
    isConnected: boolean;
    connectionError: string | null;

    // Presence
    presenceUsers: Map<string, PresenceUser>;
    getPresenceForWorkspace: (workspaceId: string) => PresenceUser[];
    getPresenceForProject: (projectId: string) => PresenceUser[];
    updateMyStatus: (status: PresenceStatus) => void;
    updateMyLocation: (location: PresenceUser["location"]) => void;

    // Typing indicators
    typingUsers: Map<string, TypingIndicator>;
    getTypingForRoom: (roomId: string) => TypingIndicator[];
    setTyping: (roomId: string, roomType: "task" | "project", isTyping: boolean) => void;

    // Notifications
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (notificationId: string) => void;
    markAllAsRead: () => void;

    // Activity feed
    activityItems: ActivityItem[];
    subscribeToActivity: (id: string, type: "project" | "workspace") => void;
    unsubscribeFromActivity: (id: string) => void;

    // Room management
    joinRoom: (roomId: string, roomType: "workspace" | "project" | "task") => void;
    leaveRoom: (roomId: string) => void;

    // Raw message handler for custom use cases
    lastMessage: WSMessage | null;
    sendMessage: (type: string, data: unknown, roomId?: string) => void;

    // Recently updated entities (for highlighting)
    recentlyUpdated: Set<string>;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

interface RealtimeProviderProps {
    children: ReactNode;
    workspaceId?: string;
}

export function RealtimeProvider({ children, workspaceId }: RealtimeProviderProps) {
    // Connection state
    const [isConnected, setIsConnected] = useState(false);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const socketRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 5;

    // Real-time state
    const [presenceUsers, setPresenceUsers] = useState<Map<string, PresenceUser>>(new Map());
    const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
    const [recentlyUpdated, setRecentlyUpdated] = useState<Set<string>>(new Set());
    const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

    // Typing timeout refs
    const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

    // ============================================================================
    // WebSocket Connection
    // ============================================================================

    const connect = useCallback(async () => {
        if (!workspaceId) return;

        try {
            // Get Supabase session
            const response = await fetch("/api/auth/session");
            if (!response.ok) {
                throw new Error("Failed to get session");
            }
            const { access_token } = await response.json();

            if (!access_token) {
                setConnectionError("No authentication token");
                return;
            }

            const fullWsUrl = `${WS_URL}/connect/${access_token}`;
            console.log("[Realtime] Connecting to WebSocket:", fullWsUrl.replace(access_token, "REDACTED"));
            const ws = new WebSocket(fullWsUrl);

            ws.onopen = () => {
                console.log("[Realtime] Connected to WebSocket server");
                setIsConnected(true);
                setConnectionError(null);
                reconnectAttempts.current = 0;

                // Initialize with workspace
                ws.send(JSON.stringify({
                    workspace_id: workspaceId,
                    user_info: {},
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const message: WSMessage = JSON.parse(event.data);
                    handleMessage(message);
                    setLastMessage(message);
                } catch (error) {
                    console.error("[Realtime] Failed to parse message:", error);
                }
            };

            ws.onclose = (event) => {
                console.log("[Realtime] Disconnected:", event.reason);
                setIsConnected(false);
                handleReconnect();
            };

            ws.onerror = (error) => {
                console.error("[Realtime] WebSocket error:", error);
                setConnectionError("Connection error");
                ws.close();
            };

            socketRef.current = ws;
        } catch (error) {
            console.error("[Realtime] Connection setup failed:", error);
            setConnectionError("Failed to connect");
            handleReconnect();
        }
    }, [workspaceId]);

    const handleReconnect = useCallback(() => {
        if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`[Realtime] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1})`);

            reconnectTimeoutRef.current = setTimeout(() => {
                reconnectAttempts.current++;
                connect();
            }, delay);
        } else {
            setConnectionError("Max reconnection attempts reached");
        }
    }, [connect]);

    // ============================================================================
    // Message Handler
    // ============================================================================

    const handleMessage = useCallback((message: WSMessage) => {
        switch (message.type) {
            case WSMessageType.PRESENCE_UPDATE:
            case WSMessageType.USER_JOINED: {
                const userData = message.data as PresenceUser;
                setPresenceUsers((prev) => {
                    const next = new Map(prev);
                    next.set(userData.userId, {
                        ...userData,
                        lastSeen: new Date(userData.lastSeen),
                    });
                    return next;
                });
                break;
            }

            case WSMessageType.USER_LEFT: {
                const { userId } = message.data as { userId: string };
                setPresenceUsers((prev) => {
                    const next = new Map(prev);
                    const user = next.get(userId);
                    if (user) {
                        next.set(userId, { ...user, status: "offline" });
                    }
                    return next;
                });
                break;
            }

            case WSMessageType.PRESENCE_LIST: {
                const users = message.data as PresenceUser[];
                setPresenceUsers(new Map(
                    users.map((user) => [
                        user.userId,
                        { ...user, lastSeen: new Date(user.lastSeen) },
                    ])
                ));
                break;
            }

            case WSMessageType.USER_TYPING: {
                const typingData = message.data as TypingIndicator & { isTyping: boolean };
                const key = `${typingData.userId}_${typingData.roomId}`;

                if (typingData.isTyping) {
                    setTypingUsers((prev) => {
                        const next = new Map(prev);
                        next.set(key, {
                            ...typingData,
                            timestamp: new Date(),
                        });
                        return next;
                    });

                    // Auto-remove after 10 seconds
                    const existingTimeout = typingTimeoutsRef.current.get(key);
                    if (existingTimeout) clearTimeout(existingTimeout);

                    typingTimeoutsRef.current.set(key, setTimeout(() => {
                        setTypingUsers((prev) => {
                            const next = new Map(prev);
                            next.delete(key);
                            return next;
                        });
                    }, 10000));
                } else {
                    setTypingUsers((prev) => {
                        const next = new Map(prev);
                        next.delete(key);
                        return next;
                    });
                }
                break;
            }

            case WSMessageType.NOTIFICATION: {
                const notification = message.data as Notification;
                setNotifications((prev) => [
                    { ...notification, createdAt: new Date(notification.createdAt) },
                    ...prev,
                ].slice(0, 100)); // Keep last 100 notifications
                break;
            }

            case WSMessageType.ACTIVITY: {
                const activity = message.data as ActivityItem;
                setActivityItems((prev) => [
                    { ...activity, timestamp: new Date(activity.timestamp) },
                    ...prev,
                ].slice(0, 50));

                // Track recently updated entity
                if (activity.entityId) {
                    setRecentlyUpdated((prev) => {
                        const next = new Set(prev);
                        next.add(activity.entityId);
                        return next;
                    });
                    setTimeout(() => {
                        setRecentlyUpdated((prev) => {
                            const next = new Set(prev);
                            next.delete(activity.entityId);
                            return next;
                        });
                    }, 5000); // Highlight for 5 seconds
                }
                break;
            }

            default:
                // Handle task updates and other custom events
                break;
        }
    }, []);

    // ============================================================================
    // Actions
    // ============================================================================

    const sendMessage = useCallback((type: string, data: unknown, roomId?: string) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
                type,
                data,
                room_id: roomId,
            }));
        }
    }, []);

    const joinRoom = useCallback((roomId: string, roomType: "workspace" | "project" | "task") => {
        sendMessage("join_room", { room_id: roomId, room_type: roomType });
    }, [sendMessage]);

    const leaveRoom = useCallback((roomId: string) => {
        sendMessage("leave_room", { room_id: roomId });
    }, [sendMessage]);

    const updateMyStatus = useCallback((status: PresenceStatus) => {
        sendMessage("update_presence", { status, timestamp: new Date().toISOString() });
    }, [sendMessage]);

    const updateMyLocation = useCallback((location: PresenceUser["location"]) => {
        sendMessage("update_location", { ...location, timestamp: new Date().toISOString() });
    }, [sendMessage]);

    const setTyping = useCallback((roomId: string, roomType: "task" | "project", isTyping: boolean) => {
        sendMessage("typing", { room_id: roomId, room_type: roomType, is_typing: isTyping });
    }, [sendMessage]);

    const markAsRead = useCallback((notificationId: string) => {
        setNotifications((prev) =>
            prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
        );
        sendMessage("mark_notification_read", { notification_id: notificationId });
    }, [sendMessage]);

    const markAllAsRead = useCallback(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        sendMessage("mark_all_notifications_read", {});
    }, [sendMessage]);

    const subscribeToActivity = useCallback((id: string, type: "project" | "workspace") => {
        joinRoom(id, type);
    }, [joinRoom]);

    const unsubscribeFromActivity = useCallback((id: string) => {
        leaveRoom(id);
    }, [leaveRoom]);

    // ============================================================================
    // Computed Values
    // ============================================================================

    const getPresenceForWorkspace = useCallback((wsId: string): PresenceUser[] => {
        return Array.from(presenceUsers.values()).filter(
            (user) => user.location?.workspaceId === wsId && user.status !== "offline"
        );
    }, [presenceUsers]);

    const getPresenceForProject = useCallback((projectId: string): PresenceUser[] => {
        return Array.from(presenceUsers.values()).filter(
            (user) => user.location?.projectId === projectId && user.status !== "offline"
        );
    }, [presenceUsers]);

    const getTypingForRoom = useCallback((roomId: string): TypingIndicator[] => {
        return Array.from(typingUsers.values()).filter(
            (indicator) => indicator.roomId === roomId
        );
    }, [typingUsers]);

    const unreadCount = notifications.filter((n) => !n.read).length;

    // ============================================================================
    // Effects
    // ============================================================================

    useEffect(() => {
        connect();

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            // Clear all typing timeouts
            typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
            typingTimeoutsRef.current.clear();
        };
    }, [connect]);

    // ============================================================================
    // Context Value
    // ============================================================================

    const value: RealtimeContextValue = {
        isConnected,
        connectionError,
        presenceUsers,
        getPresenceForWorkspace,
        getPresenceForProject,
        updateMyStatus,
        updateMyLocation,
        typingUsers,
        getTypingForRoom,
        setTyping,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        activityItems,
        subscribeToActivity,
        unsubscribeFromActivity,
        joinRoom,
        leaveRoom,
        lastMessage,
        sendMessage,
        recentlyUpdated,
    };

    return (
        <RealtimeContext.Provider value={value}>
            {children}
        </RealtimeContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

export function useRealtime(): RealtimeContextValue {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error("useRealtime must be used within a RealtimeProvider");
    }
    return context;
}

export function usePresence(workspaceId: string): PresenceUser[] {
    const { getPresenceForWorkspace } = useRealtime();
    return getPresenceForWorkspace(workspaceId);
}

export function useProjectPresence(projectId: string): PresenceUser[] {
    const { getPresenceForProject } = useRealtime();
    return getPresenceForProject(projectId);
}

export function useNotifications() {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtime();
    return { notifications, unreadCount, markAsRead, markAllAsRead };
}

export function useTypingIndicator(roomId: string, roomType: "task" | "project") {
    const { getTypingForRoom, setTyping } = useRealtime();
    const typingUsers = getTypingForRoom(roomId);

    const startTyping = useCallback(() => {
        setTyping(roomId, roomType, true);
    }, [roomId, roomType, setTyping]);

    const stopTyping = useCallback(() => {
        setTyping(roomId, roomType, false);
    }, [roomId, roomType, setTyping]);

    return { typingUsers, startTyping, stopTyping };
}

export function useActivityFeed(projectId?: string, workspaceId?: string) {
    const { activityItems, subscribeToActivity, unsubscribeFromActivity } = useRealtime();

    useEffect(() => {
        const id = projectId || workspaceId;
        const type = projectId ? "project" : "workspace";

        if (id) {
            subscribeToActivity(id, type);
            return () => unsubscribeFromActivity(id);
        }
    }, [projectId, workspaceId, subscribeToActivity, unsubscribeFromActivity]);

    return projectId
        ? activityItems.filter((item) =>
            item.entityType === "project" && item.entityId === projectId
        )
        : workspaceId
            ? activityItems.filter((item) =>
                item.workspaceId === workspaceId
            )
            : activityItems;
}

export function useConnectionStatus() {
    const { isConnected, connectionError } = useRealtime();
    return { isConnected, connectionError };
}

export function useRecentlyUpdated() {
    const { recentlyUpdated } = useRealtime();
    return recentlyUpdated;
}
