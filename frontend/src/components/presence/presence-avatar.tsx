"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { PresenceStatus } from "@/contexts/realtime-context";

// ============================================================================
// Status Indicator Component
// ============================================================================

interface StatusIndicatorProps {
    status: PresenceStatus;
    size?: "sm" | "md" | "lg";
    showPulse?: boolean;
    className?: string;
}

const statusColors: Record<PresenceStatus, string> = {
    online: "bg-emerald-500",
    idle: "bg-amber-400",
    away: "bg-slate-400",
    offline: "bg-slate-300",
    busy: "bg-rose-500",
};

const statusSizes = {
    sm: "size-2",
    md: "size-2.5",
    lg: "size-3",
};

export function StatusIndicator({
    status,
    size = "md",
    showPulse = false,
    className,
}: StatusIndicatorProps) {
    const isActive = status === "online";

    return (
        <span
            className={cn(
                "inline-block rounded-full ring-2 ring-white dark:ring-slate-900",
                statusColors[status],
                statusSizes[size],
                showPulse && isActive && "animate-pulse",
                className
            )}
            aria-label={`Status: ${status}`}
        />
    );
}

// ============================================================================
// Presence Avatar Component
// ============================================================================

interface PresenceAvatarProps {
    name: string;
    avatarUrl?: string;
    avatarColor?: string;
    status?: PresenceStatus;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    showStatus?: boolean;
    showPulse?: boolean;
    className?: string;
    onClick?: () => void;
}

const avatarSizes = {
    xs: "size-6",
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
    xl: "size-16",
};

const fallbackSizes = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
    xl: "text-xl",
};

const indicatorPositions = {
    xs: "-bottom-0.5 -right-0.5",
    sm: "-bottom-0.5 -right-0.5",
    md: "bottom-0 right-0",
    lg: "bottom-0.5 right-0.5",
    xl: "bottom-1 right-1",
};

const indicatorSizes: Record<string, "sm" | "md" | "lg"> = {
    xs: "sm",
    sm: "sm",
    md: "md",
    lg: "md",
    xl: "lg",
};

export function PresenceAvatar({
    name,
    avatarUrl,
    avatarColor,
    status = "offline",
    size = "md",
    showStatus = true,
    showPulse = false,
    className,
    onClick,
}: PresenceAvatarProps) {
    const initials = name
        .split(" ")
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const fallbackBg = avatarColor || "bg-blue-500";

    return (
        <div
            className={cn(
                "relative inline-flex shrink-0",
                onClick && "cursor-pointer",
                className
            )}
            onClick={onClick}
        >
            <Avatar className={cn(avatarSizes[size], "transition-transform duration-200 ease-out hover:scale-105")}>
                {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
                <AvatarFallback
                    className={cn(
                        fallbackBg,
                        "text-white font-medium",
                        fallbackSizes[size]
                    )}
                    style={
                        avatarColor?.startsWith("#")
                            ? { backgroundColor: avatarColor }
                            : undefined
                    }
                >
                    {initials}
                </AvatarFallback>
            </Avatar>

            {showStatus && status !== "offline" && (
                <span className={cn("absolute", indicatorPositions[size])}>
                    <StatusIndicator
                        status={status}
                        size={indicatorSizes[size]}
                        showPulse={showPulse}
                    />
                </span>
            )}
        </div>
    );
}

// ============================================================================
// Presence Avatar Stack (for showing multiple users)
// ============================================================================

interface PresenceAvatarStackProps {
    users: Array<{
        id: string;
        name: string;
        avatarUrl?: string;
        avatarColor?: string;
        status?: PresenceStatus;
    }>;
    maxDisplay?: number;
    size?: "xs" | "sm" | "md" | "lg";
    showStatus?: boolean;
    className?: string;
}

export function PresenceAvatarStack({
    users,
    maxDisplay = 4,
    size = "sm",
    showStatus = true,
    className,
}: PresenceAvatarStackProps) {
    const displayUsers = users.slice(0, maxDisplay);
    const remainingCount = users.length - maxDisplay;

    const overlapMargins = {
        xs: "-ml-2",
        sm: "-ml-2.5",
        md: "-ml-3",
        lg: "-ml-4",
    };

    return (
        <div className={cn("flex items-center", className)}>
            {displayUsers.map((user, index) => (
                <div
                    key={user.id}
                    className={cn(
                        "ring-2 ring-white dark:ring-slate-900 rounded-full",
                        index > 0 && overlapMargins[size]
                    )}
                    style={{ zIndex: displayUsers.length - index }}
                >
                    <PresenceAvatar
                        name={user.name}
                        avatarUrl={user.avatarUrl}
                        avatarColor={user.avatarColor}
                        status={user.status}
                        size={size}
                        showStatus={showStatus}
                    />
                </div>
            ))}

            {remainingCount > 0 && (
                <div
                    className={cn(
                        "flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 ring-2 ring-white dark:ring-slate-900 text-slate-600 dark:text-slate-300 font-medium",
                        avatarSizes[size],
                        fallbackSizes[size],
                        overlapMargins[size]
                    )}
                    style={{ zIndex: 0 }}
                >
                    +{remainingCount}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Typing Indicator Component
// ============================================================================

interface TypingIndicatorProps {
    users: Array<{ name: string }>;
    className?: string;
}

export function TypingIndicator({ users, className }: TypingIndicatorProps) {
    if (users.length === 0) return null;

    const names =
        users.length === 1
            ? users[0].name
            : users.length === 2
                ? `${users[0].name} and ${users[1].name}`
                : `${users[0].name} and ${users.length - 1} others`;

    return (
        <div
            className={cn(
                "flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400",
                className
            )}
        >
            <div className="flex items-center gap-0.5">
                <span
                    className="size-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "0ms" }}
                />
                <span
                    className="size-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "150ms" }}
                />
                <span
                    className="size-1.5 rounded-full bg-slate-400 animate-bounce"
                    style={{ animationDelay: "300ms" }}
                />
            </div>
            <span>{names} {users.length === 1 ? "is" : "are"} typing...</span>
        </div>
    );
}

// ============================================================================
// Connection Status Badge
// ============================================================================

interface ConnectionStatusProps {
    isConnected: boolean;
    error?: string | null;
    showLabel?: boolean;
    className?: string;
}

export function ConnectionStatus({
    isConnected,
    error,
    showLabel = false,
    className,
}: ConnectionStatusProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center gap-1.5",
                className
            )}
            title={error || (isConnected ? "Connected" : "Disconnected")}
        >
            <span
                className={cn(
                    "size-2 rounded-full transition-colors duration-300",
                    isConnected
                        ? "bg-emerald-500"
                        : error
                            ? "bg-rose-500"
                            : "bg-amber-400 animate-pulse"
                )}
            />
            {showLabel && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                    {isConnected ? "Live" : error ? "Error" : "Connecting..."}
                </span>
            )}
        </div>
    );
}

// ============================================================================
// Editing Indicator (for task/document editing awareness)
// ============================================================================

interface EditingIndicatorProps {
    users: Array<{ name: string; avatarColor?: string }>;
    entityName?: string;
    className?: string;
}

export function EditingIndicator({
    users,
    entityName = "this",
    className,
}: EditingIndicatorProps) {
    if (users.length === 0) return null;

    const names =
        users.length === 1
            ? users[0].name
            : users.length === 2
                ? `${users[0].name} and ${users[1].name}`
                : `${users[0].name} and ${users.length - 1} others`;

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full text-sm text-amber-700 dark:text-amber-400",
                className
            )}
        >
            <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
                <strong>{names}</strong> {users.length === 1 ? "is" : "are"} editing{" "}
                {entityName}
            </span>
        </div>
    );
}
