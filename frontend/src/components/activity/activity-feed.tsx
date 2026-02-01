"use client";

import React from "react";
import { formatDistanceToNow } from "date-fns";
import {
    Plus,
    Check,
    RefreshCw,
    MessageSquare,
    UserPlus,
    Edit3,
    Trash2,
    ArrowRight,
    GitBranch,
    Calendar,
    Flag,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useActivityFeed } from "@/contexts/realtime-context";
import type { ActivityItem } from "@/contexts/realtime-context";
import { ScrollArea } from "@/components/ui/scroll-area";

// ============================================================================
// Activity Icons & Colors
// ============================================================================

const actionConfig: Record<
    string,
    { icon: React.ElementType; color: string; bgColor: string }
> = {
    created: {
        icon: Plus,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    completed: {
        icon: Check,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    updated: {
        icon: RefreshCw,
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    commented: {
        icon: MessageSquare,
        color: "text-violet-600",
        bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    assigned: {
        icon: UserPlus,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    edited: {
        icon: Edit3,
        color: "text-slate-600",
        bgColor: "bg-slate-100 dark:bg-slate-800",
    },
    deleted: {
        icon: Trash2,
        color: "text-rose-600",
        bgColor: "bg-rose-50 dark:bg-rose-900/20",
    },
    moved: {
        icon: ArrowRight,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    },
    status_changed: {
        icon: GitBranch,
        color: "text-teal-600",
        bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    scheduled: {
        icon: Calendar,
        color: "text-orange-600",
        bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
    priority_changed: {
        icon: Flag,
        color: "text-pink-600",
        bgColor: "bg-pink-50 dark:bg-pink-900/20",
    },
};

const defaultConfig = {
    icon: RefreshCw,
    color: "text-slate-500",
    bgColor: "bg-slate-100 dark:bg-slate-800",
};

// ============================================================================
// Activity Feed Component
// ============================================================================

interface ActivityFeedProps {
    projectId?: string;
    workspaceId?: string;
    maxHeight?: string;
    showHeader?: boolean;
    className?: string;
}

export function ActivityFeed({
    projectId,
    workspaceId,
    maxHeight = "400px",
    showHeader = true,
    className,
}: ActivityFeedProps) {
    const activityItems = useActivityFeed(projectId, workspaceId);

    return (
        <div className={cn("rounded-lg bg-card border", className)}>
            {showHeader && (
                <div className="px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground">
                            Activity Feed
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            Live updates
                        </span>
                    </div>
                </div>
            )}

            <ScrollArea style={{ maxHeight }}>
                {activityItems.length === 0 ? (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                        <p className="opacity-60">No recent activity</p>
                        <p className="text-xs opacity-40 mt-1">
                            Activity will appear here as it happens
                        </p>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[1.375rem] top-0 bottom-0 w-px bg-border" />

                        <div className="py-2">
                            {activityItems.map((item, index) => (
                                <ActivityFeedItem
                                    key={item.id}
                                    item={item}
                                    isFirst={index === 0}
                                    isLast={index === activityItems.length - 1}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

// ============================================================================
// Activity Feed Item
// ============================================================================

interface ActivityFeedItemProps {
    item: ActivityItem;
    isFirst?: boolean;
    isLast?: boolean;
    onClick?: () => void;
}

export function ActivityFeedItem({
    item,
    isFirst = false,
    isLast = false,
    onClick,
}: ActivityFeedItemProps) {
    const config = actionConfig[item.action] || defaultConfig;
    const Icon = config.icon;

    return (
        <div
            className={cn(
                "relative flex items-start gap-3 px-4 py-2.5",
                "transition-colors duration-150",
                "hover:bg-accent/30",
                onClick && "cursor-pointer"
            )}
            onClick={onClick}
        >
            {/* Icon with background */}
            <div
                className={cn(
                    "relative z-10 flex items-center justify-center",
                    "size-7 rounded-full shrink-0",
                    config.bgColor
                )}
            >
                <Icon className={cn("size-3.5", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm text-foreground leading-snug">
                    <span className="font-medium">{item.userName}</span>{" "}
                    <span className="text-muted-foreground">
                        {getActionVerb(item.action)}
                    </span>{" "}
                    <span className="font-medium">{item.entityName}</span>
                </p>

                {/* Details */}
                {item.details && Object.keys(item.details).length > 0 && (
                    <ActivityDetails details={item.details} action={item.action} />
                )}

                {/* Timestamp */}
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                </p>
            </div>
        </div>
    );
}

// ============================================================================
// Activity Details
// ============================================================================

interface ActivityDetailsProps {
    details: Record<string, unknown>;
    action: string;
}

function ActivityDetails({ details, action }: ActivityDetailsProps) {
    const renderContent = () => {
        switch (action) {
            case "status_changed":
                return (
                    <div className="flex items-center gap-1.5 text-xs">
                        <StatusBadge status={details.from as string} />
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <StatusBadge status={details.to as string} />
                    </div>
                );

            case "assigned":
                return (
                    <p className="text-xs text-muted-foreground">
                        Assigned to <span className="font-medium">{String(details.assignee)}</span>
                    </p>
                );

            case "commented":
                return (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                        &ldquo;{String(details.comment)}&rdquo;
                    </p>
                );

            case "priority_changed":
                return (
                    <div className="flex items-center gap-1.5 text-xs">
                        <PriorityBadge priority={details.from as string} />
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <PriorityBadge priority={details.to as string} />
                    </div>
                );

            default:
                return null;
        }
    };

    const content = renderContent();
    if (!content) return null;

    return <div className="mt-1.5">{content}</div>;
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
    const statusColors: Record<string, string> = {
        backlog: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        todo: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
        in_progress: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        in_review: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        done: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
        blocked: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    };

    return (
        <span
            className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                statusColors[status?.toLowerCase()] || statusColors.todo
            )}
        >
            {status?.replace(/_/g, " ")}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const priorityColors: Record<string, string> = {
        critical: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
        high: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
        medium: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
        low: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    };

    return (
        <span
            className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-medium capitalize",
                priorityColors[priority?.toLowerCase()] || priorityColors.medium
            )}
        >
            {priority}
        </span>
    );
}

// ============================================================================
// Helper Functions
// ============================================================================

function getActionVerb(action: string): string {
    const verbs: Record<string, string> = {
        created: "created",
        completed: "completed",
        updated: "updated",
        commented: "commented on",
        assigned: "assigned",
        edited: "edited",
        deleted: "deleted",
        moved: "moved",
        status_changed: "changed status of",
        scheduled: "scheduled",
        priority_changed: "changed priority of",
    };

    return verbs[action] || action;
}

// ============================================================================
// Compact Activity Feed (for sidebar or small areas)
// ============================================================================

interface CompactActivityFeedProps {
    projectId?: string;
    workspaceId?: string;
    maxItems?: number;
    className?: string;
}

export function CompactActivityFeed({
    projectId,
    workspaceId,
    maxItems = 5,
    className,
}: CompactActivityFeedProps) {
    const activityItems = useActivityFeed(projectId, workspaceId);
    const displayItems = activityItems.slice(0, maxItems);

    if (displayItems.length === 0) {
        return null;
    }

    return (
        <div className={cn("space-y-2", className)}>
            {displayItems.map((item) => (
                <div
                    key={item.id}
                    className="flex items-start gap-2 text-xs"
                >
                    <span className="text-muted-foreground shrink-0">
                        {formatDistanceToNow(item.timestamp, { addSuffix: false })}
                    </span>
                    <span className="text-foreground">
                        <span className="font-medium">{item.userName}</span>{" "}
                        {getActionVerb(item.action)}{" "}
                        <span className="font-medium">{item.entityName}</span>
                    </span>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// Exports
// ============================================================================

export { actionConfig };
