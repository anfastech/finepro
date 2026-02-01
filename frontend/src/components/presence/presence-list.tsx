"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { usePresence } from "@/contexts/realtime-context";
import {
    PresenceAvatar,
    StatusIndicator,
} from "@/components/presence/presence-avatar";
import type { PresenceStatus } from "@/contexts/realtime-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// ============================================================================
// Presence List Component
// ============================================================================

interface PresenceListProps {
    workspaceId: string;
    maxHeight?: string;
    showHeader?: boolean;
    className?: string;
}

export function PresenceList({
    workspaceId,
    maxHeight = "300px",
    showHeader = true,
    className,
}: PresenceListProps) {
    const presenceUsers = usePresence(workspaceId);

    // Group users by status
    const groupedUsers = React.useMemo(() => {
        const groups: Record<PresenceStatus, typeof presenceUsers> = {
            online: [],
            busy: [],
            idle: [],
            away: [],
            offline: [],
        };

        presenceUsers.forEach((user) => {
            groups[user.status].push(user);
        });

        return groups;
    }, [presenceUsers]);

    const statusOrder: PresenceStatus[] = ["online", "busy", "idle", "away"];
    const totalOnline = presenceUsers.filter(
        (u) => u.status !== "offline"
    ).length;

    return (
        <div className={cn("rounded-lg bg-card border", className)}>
            {showHeader && (
                <div className="px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            Team Members
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {totalOnline} online
                        </span>
                    </div>
                </div>
            )}

            <ScrollArea style={{ maxHeight }} className="p-2">
                {totalOnline === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        No team members online
                    </div>
                ) : (
                    <div className="space-y-1">
                        {statusOrder.map((status) => {
                            const users = groupedUsers[status];
                            if (users.length === 0) return null;

                            return (
                                <div key={status}>
                                    {users.map((user) => (
                                        <PresenceListItem
                                            key={user.userId}
                                            name={user.name}
                                            email={user.email}
                                            avatarColor={user.avatarColor}
                                            status={user.status}
                                            location={getLocationLabel(user.location)}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

// ============================================================================
// Presence List Item
// ============================================================================

interface PresenceListItemProps {
    name: string;
    email?: string;
    avatarColor?: string;
    avatarUrl?: string;
    status: PresenceStatus;
    location?: string;
    onClick?: () => void;
}

function PresenceListItem({
    name,
    email,
    avatarColor,
    avatarUrl,
    status,
    location,
    onClick,
}: PresenceListItemProps) {
    return (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-colors duration-150",
                "hover:bg-accent/50",
                onClick && "cursor-pointer"
            )}
            onClick={onClick}
        >
            <PresenceAvatar
                name={name}
                avatarUrl={avatarUrl}
                avatarColor={avatarColor}
                status={status}
                size="sm"
                showStatus={true}
            />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{name}</p>
                {location && (
                    <p className="text-xs text-muted-foreground truncate">{location}</p>
                )}
            </div>

            <StatusBadge status={status} />
        </div>
    );
}

// ============================================================================
// Status Badge
// ============================================================================

interface StatusBadgeProps {
    status: PresenceStatus;
    showLabel?: boolean;
    className?: string;
}

const statusLabels: Record<PresenceStatus, string> = {
    online: "Online",
    idle: "Idle",
    away: "Away",
    offline: "Offline",
    busy: "Busy",
};

function StatusBadge({
    status,
    showLabel = true,
    className,
}: StatusBadgeProps) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs",
                            status === "online" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                            status === "idle" && "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            status === "away" && "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                            status === "busy" && "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                            status === "offline" && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500",
                            className
                        )}
                    >
                        <StatusIndicator status={status} size="sm" />
                        {showLabel && <span>{statusLabels[status]}</span>}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>
                        {status === "online" && "Active now"}
                        {status === "idle" && "Idle for a few minutes"}
                        {status === "away" && "Away from desk"}
                        {status === "busy" && "Do not disturb"}
                        {status === "offline" && "Offline"}
                    </p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ============================================================================
// Compact Presence Indicator (for navbar/header)
// ============================================================================

interface CompactPresenceProps {
    workspaceId: string;
    maxDisplay?: number;
    className?: string;
}

export function CompactPresence({
    workspaceId,
    maxDisplay = 5,
    className,
}: CompactPresenceProps) {
    const presenceUsers = usePresence(workspaceId);
    const onlineUsers = presenceUsers.filter((u) => u.status !== "offline");
    const displayUsers = onlineUsers.slice(0, maxDisplay);
    const remainingCount = onlineUsers.length - maxDisplay;

    if (onlineUsers.length === 0) {
        return null;
    }

    return (
        <TooltipProvider>
            <div className={cn("flex items-center", className)}>
                {displayUsers.map((user, index) => (
                    <Tooltip key={user.userId}>
                        <TooltipTrigger asChild>
                            <div
                                className={cn(
                                    "ring-2 ring-background rounded-full",
                                    index > 0 && "-ml-2"
                                )}
                                style={{ zIndex: displayUsers.length - index }}
                            >
                                <PresenceAvatar
                                    name={user.name}
                                    avatarColor={user.avatarColor}
                                    status={user.status}
                                    size="xs"
                                    showStatus={true}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs opacity-80">{statusLabels[user.status]}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}

                {remainingCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div
                                className="flex items-center justify-center size-6 rounded-full bg-muted ring-2 ring-background text-[10px] font-medium text-muted-foreground -ml-2"
                                style={{ zIndex: 0 }}
                            >
                                +{remainingCount}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{remainingCount} more online</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </TooltipProvider>
    );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getLocationLabel(
    location?: { workspaceId?: string; projectId?: string; taskId?: string }
): string | undefined {
    if (!location) return undefined;

    if (location.taskId) {
        return "Viewing a task";
    }
    if (location.projectId) {
        return "In a project";
    }
    return "In workspace";
}

// ============================================================================
// Exports
// ============================================================================

export { StatusBadge, PresenceListItem };
