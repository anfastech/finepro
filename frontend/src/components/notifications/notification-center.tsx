"use client";

import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
    Bell,
    Check,
    CheckCheck,
    X,
    Settings,
    AlertCircle,
    Calendar,
    MessageSquare,
    AtSign,
    Rocket,
    Zap,
    Clock,
    AlertTriangle,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useNotifications } from "@/contexts/realtime-context";
import type { Notification } from "@/contexts/realtime-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// ============================================================================
// Notification Icons & Colors
// ============================================================================

const notificationConfig: Record<
    Notification["type"],
    { icon: React.ElementType; color: string; bgColor: string }
> = {
    task_assigned: {
        icon: Zap,
        color: "text-blue-600",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    task_due_soon: {
        icon: Clock,
        color: "text-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
    },
    task_overdue: {
        icon: AlertTriangle,
        color: "text-rose-600",
        bgColor: "bg-rose-50 dark:bg-rose-900/20",
    },
    task_completed: {
        icon: Check,
        color: "text-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    comment_added: {
        icon: MessageSquare,
        color: "text-violet-600",
        bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    mention: {
        icon: AtSign,
        color: "text-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/20",
    },
    project_update: {
        icon: Rocket,
        color: "text-cyan-600",
        bgColor: "bg-cyan-50 dark:bg-cyan-900/20",
    },
    sprint_update: {
        icon: Calendar,
        color: "text-teal-600",
        bgColor: "bg-teal-50 dark:bg-teal-900/20",
    },
    system: {
        icon: AlertCircle,
        color: "text-slate-600",
        bgColor: "bg-slate-50 dark:bg-slate-800",
    },
};

const priorityColors: Record<Notification["priority"], string> = {
    critical: "bg-rose-500",
    high: "bg-amber-500",
    medium: "bg-blue-500",
    low: "bg-slate-400",
};

// ============================================================================
// Notification Bell (Trigger Button)
// ============================================================================

interface NotificationBellProps {
    className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
    const { unreadCount } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("relative h-9 w-9", className)}
                >
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <span
                            className={cn(
                                "absolute -top-0.5 -right-0.5 flex items-center justify-center",
                                "min-w-[18px] h-[18px] px-1 rounded-full",
                                "bg-rose-500 text-white text-[10px] font-bold",
                                "animate-in zoom-in-50 duration-200"
                            )}
                        >
                            {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[380px] p-0"
                align="end"
                sideOffset={8}
            >
                <NotificationCenter onClose={() => setIsOpen(false)} />
            </PopoverContent>
        </Popover>
    );
}

// ============================================================================
// Notification Center
// ============================================================================

interface NotificationCenterProps {
    onClose?: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } =
        useNotifications();

    // Group notifications by time
    const groupedNotifications = React.useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        const groups: {
            label: string;
            notifications: Notification[];
        }[] = [
                { label: "New", notifications: [] },
                { label: "Today", notifications: [] },
                { label: "Yesterday", notifications: [] },
                { label: "Earlier", notifications: [] },
            ];

        notifications.forEach((notification) => {
            const notifDate = new Date(notification.createdAt);

            if (!notification.read) {
                groups[0].notifications.push(notification);
            } else if (notifDate >= today) {
                groups[1].notifications.push(notification);
            } else if (notifDate >= yesterday) {
                groups[2].notifications.push(notification);
            } else {
                groups[3].notifications.push(notification);
            }
        });

        return groups.filter((g) => g.notifications.length > 0);
    }, [notifications]);

    return (
        <div className="flex flex-col max-h-[480px]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">Notifications</h3>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {unreadCount} new
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={markAllAsRead}
                        >
                            <CheckCheck className="size-3.5 mr-1" />
                            Mark all read
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-8">
                        <Settings className="size-4" />
                    </Button>
                </div>
            </div>

            {/* Notifications List */}
            <ScrollArea className="flex-1">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Bell className="size-10 mb-3 opacity-30" />
                        <p className="text-sm">No notifications yet</p>
                        <p className="text-xs opacity-70">
                            We&apos;ll notify you when something happens
                        </p>
                    </div>
                ) : (
                    <div className="py-2">
                        {groupedNotifications.map((group) => (
                            <div key={group.label}>
                                <div className="px-4 py-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        {group.label}
                                    </span>
                                </div>
                                {group.notifications.map((notification) => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onMarkRead={() => markAsRead(notification.id)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Footer */}
            {notifications.length > 0 && (
                <>
                    <Separator />
                    <div className="p-2">
                        <Button
                            variant="ghost"
                            className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
                        >
                            View all notifications
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================================================
// Notification Item
// ============================================================================

interface NotificationItemProps {
    notification: Notification;
    onMarkRead: () => void;
    onClick?: () => void;
}

export function NotificationItem({
    notification,
    onMarkRead,
    onClick,
}: NotificationItemProps) {
    const config = notificationConfig[notification.type];
    const Icon = config.icon;

    const handleClick = () => {
        if (!notification.read) {
            onMarkRead();
        }
        onClick?.();
    };

    return (
        <div
            className={cn(
                "flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150",
                "hover:bg-accent/50",
                !notification.read && "bg-accent/30"
            )}
            onClick={handleClick}
        >
            {/* Icon */}
            <div
                className={cn(
                    "flex items-center justify-center size-9 rounded-full shrink-0",
                    config.bgColor
                )}
            >
                <Icon className={cn("size-4", config.color)} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p
                        className={cn(
                            "text-sm leading-snug",
                            !notification.read ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                    >
                        {notification.title}
                    </p>
                    {!notification.read && (
                        <span className={cn("size-2 rounded-full shrink-0 mt-1.5", priorityColors[notification.priority])} />
                    )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                </p>
            </div>

            {/* Mark as read button */}
            {!notification.read && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={(e) => {
                        e.stopPropagation();
                        onMarkRead();
                    }}
                >
                    <Check className="size-3.5" />
                </Button>
            )}
        </div>
    );
}

// ============================================================================
// Notification Toast (for real-time popups)
// ============================================================================

interface NotificationToastProps {
    notification: Notification;
    onDismiss: () => void;
    onClick?: () => void;
}

export function NotificationToast({
    notification,
    onDismiss,
    onClick,
}: NotificationToastProps) {
    const config = notificationConfig[notification.type];
    const Icon = config.icon;

    return (
        <div
            className={cn(
                "flex items-start gap-3 p-4 bg-card border rounded-lg shadow-lg",
                "animate-in slide-in-from-top-2 duration-300",
                "cursor-pointer"
            )}
            onClick={onClick}
        >
            <div
                className={cn(
                    "flex items-center justify-center size-10 rounded-full shrink-0",
                    config.bgColor
                )}
            >
                <Icon className={cn("size-5", config.color)} />
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                    {notification.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                </p>
            </div>

            <Button
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                }}
            >
                <X className="size-4" />
            </Button>
        </div>
    );
}

// ============================================================================
// Exports
// ============================================================================

export { notificationConfig, priorityColors };
