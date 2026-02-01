"use client";

import { usePathname } from "next/navigation";
import { Search, LayoutGrid, Filter, Plus } from "lucide-react";

import { MobileSidebar } from "./mobile-sidebar";
import { UserBtn } from "@/features/auth/components/UserBtn";
import { Button } from "./ui/button";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateTaskModel } from "@/features/tasks/hooks/use-create-task-modal";
import { NotificationBell } from "@/components/notifications";
import { ConnectionStatus, PresenceAvatar } from "@/components/presence";
import { useConnectionStatus, useRealtime } from "@/contexts/realtime-context";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const pathnameMap = {
    "tasks": {
        title: "My Tasks",
        description: "View all of your tasks here",
    },
    "projects": {
        title: "My Project",
        description: "View all of your projects here",
    }
}

const defaultMap = {
    title: "Home",
    description: "Monitor all of your projects and tasks in one place"
}

export const Navbar = () => {
    const pathname = usePathname();
    const pathnameParts = pathname.split("/");
    const workspaceId = useWorkspaceId();
    const { data: members } = useGetMembers({ workspaceId });
    const { open: openCreateTask } = useCreateTaskModel();
    const { isConnected, connectionError } = useConnectionStatus();
    const { presenceUsers } = useRealtime();

    const pathnameKey = pathnameParts[3] as keyof typeof pathnameMap;
    const { title, description } = pathnameMap[pathnameKey] || defaultMap;

    // Show first 6 members
    const displayMembers = members?.documents?.slice(0, 6) || [];
    const remainingCount = (members?.total || 0) - displayMembers.length;

    return (
        <div className="pt-4 px-6 pb-4 flex items-center justify-between bg-gray-50 border-b">
            <div className="flex items-center gap-4 flex-1">
                <MobileSidebar />
                <Button variant="ghost" size="sm" className="hidden lg:flex">
                    Tools
                </Button>
                <Button
                    onClick={openCreateTask}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Plus className="size-4 mr-2" />
                    Add new
                </Button>
            </div>

            <div className="flex items-center gap-3">
                {/* Connection status indicator */}
                <div className="hidden lg:flex items-center">
                    <ConnectionStatus
                        isConnected={isConnected}
                        error={connectionError}
                        showLabel={false}
                    />
                </div>

                <div className="hidden lg:flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Search className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <LayoutGrid className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Filter className="size-4" />
                    </Button>
                </div>

                {/* Team presence avatars */}
                <TooltipProvider>
                    <div className="hidden lg:flex items-center gap-2 -space-x-2">
                        {displayMembers.map((member: any, index: number) => (
                            <Tooltip key={member.$id}>
                                <TooltipTrigger asChild>
                                    <div
                                        className="ring-2 ring-white rounded-full"
                                        style={{ zIndex: displayMembers.length - index }}
                                    >
                                        <PresenceAvatar
                                            name={member.name || member.email || ""}
                                            avatarColor={member.avatarColor?.bg || member.avatar_color?.bg || "#3b82f6"}
                                            size="xs"
                                            showStatus={true}
                                            status={presenceUsers.get(member.userId || member.user_id)?.status || 'offline'}
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p className="font-medium">{member.name || member.email}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                        {remainingCount > 0 && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div
                                        className="size-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-medium text-gray-600"
                                        style={{ zIndex: 0 }}
                                    >
                                        +{remainingCount}
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{remainingCount} more team members</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </TooltipProvider>

                {/* Notification bell */}
                <NotificationBell />

                {/* User button */}
                <UserBtn />
            </div>
        </div>
    )
}