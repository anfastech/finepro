"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, LayoutGrid, Filter, Plus } from "lucide-react";

import { MobileSidebar } from "./mobile-sidebar";
import { UserBtn } from "@/features/auth/components/UserBtn";
import { Button } from "./ui/button";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { MemberAvatar } from "@/features/members/components/member-avatar";
import { useCreateTaskModel } from "@/features/tasks/hooks/use-create-task-modal";

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

                <div className="hidden lg:flex items-center gap-2 -space-x-2">
                    {displayMembers.map((member) => (
                        <div key={member.$id} className="size-8 -ml-3 rounded-full border-2 border-white overflow">
                            <MemberAvatar
                                className="size-8"
                                name={member.name || member.email || ""}
                                avatarColor={member.avatarColor}
                            />
                        </div>
                    ))}
                    {remainingCount > 0 && (
                        <div className="size-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                            +{remainingCount}
                        </div>
                    )}
                </div>

                <div className="relative">
                    <Button variant="ghost" size="icon" className="relative h-9 w-9">
                        <Bell className="size-5" />
                        {members && members.total > 0 && (
                            <span className="absolute hidden top-0 right-0 size-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                12
                            </span>
                        )}
                    </Button>
                </div>

                <div className="relative">
                    <UserBtn />
                    {members && members.total > 0 && (
                        <span className="absolute hidden -top-1 -right-1 size-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            2
                        </span>
                    )}
                </div>
            </div>
        </div>
    )
}