"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, CheckCircle2, Calendar, List, Users, Settings } from "lucide-react";
import { useMemo } from "react";
import { DottedSeparator } from "./dotted-separator";
import { Navigation } from "./Navigation";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { Projects } from "@/components/projects";
import { Teams } from "./Teams";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useCurrent } from "@/features/auth/api/use-current";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { Task } from "@/features/tasks/types";
import { cn } from "@/lib/utils";

export const Sidebar = () => {
  const { data: user } = useCurrent();
  const workspaceId = useWorkspaceId();
  const pathname = usePathname();

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || "User";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Get tasks for calendar badge count (tasks due this month)
  const { data: tasks } = useGetTasks({ workspaceId });
  const calendarTaskCount = useMemo(() => {
    if (!tasks) return 0;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return tasks.documents.filter((task: Task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfMonth && dueDate <= endOfMonth;
    }).length;
  }, [tasks]);

  // Right edge icons configuration
  const rightIcons = [
    {
      icon: CheckCircle2,
      href: `/workspaces/${workspaceId}/tasks`,
      label: "My Tasks",
    },
    {
      icon: Calendar,
      href: `/workspaces/${workspaceId}/tasks`,
      label: "Calendar",
      badge: calendarTaskCount > 0 ? calendarTaskCount : undefined,
    },
    {
      icon: List,
      href: `/workspaces/${workspaceId}/tasks`,
      label: "List View",
    },
    {
      icon: Users,
      href: `/workspaces/${workspaceId}/members`,
      label: "Members",
    },
    {
      icon: Settings,
      href: `/workspaces/${workspaceId}/settings`,
      label: "Settings",
    },
  ];

  return (
    <aside className="h-full bg-[#1e3a5f] p-4 w-full flex flex-col text-white relative">
      {/* Right Edge Vertical Icons */}
      <div className="absolute right-0 top-0 bottom-0 flex flex-col items-center justify-start pt-4 gap-2 z-10">
        {rightIcons.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex items-center justify-center size-10 rounded-md transition-all duration-200",
                "hover:bg-white/10 hover:scale-110",
                isActive && "bg-white/20"
              )}
              aria-label={item.label}
            >
              <Icon className={cn(
                "size-5 transition-colors duration-200",
                isActive ? "text-white" : "text-neutral-400"
              )} />
              {item.badge && item.badge > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 size-5 p-0 flex items-center justify-center text-[10px] font-bold"
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="pr-12 flex flex-col h-full">
        <div className="mb-4 w-full">
          <WorkspaceSwitcher />
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 size-4 text-neutral-400" />
            <Input
              placeholder="Search..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-neutral-400 focus-visible:border-white/40 transition-all duration-200"
            />
          </div>
        </div>

        {/* My work section */}
        <Link href={`/workspaces/${workspaceId}`}>
          <div className={cn(
            "flex items-center gap-2.5 p-2.5 rounded-md mb-4 transition-all duration-200 cursor-pointer",
            "hover:bg-white/10",
            pathname === `/workspaces/${workspaceId}` && "bg-white/20"
          )}>
            <div className="size-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm shrink-0">
              {avatarInitial}
            </div>
            <span className="text-sm font-medium text-white">My work</span>
          </div>
        </Link>

        <DottedSeparator className="my-4" color="rgba(255,255,255,0.2)" />

        <Navigation />

        <DottedSeparator className="my-4" color="rgba(255,255,255,0.2)" />

        <Teams />

        <DottedSeparator className="my-4" color="rgba(255,255,255,0.2)" />

        <div className="flex-1 overflow-y-auto">
          <Projects />
        </div>

        <div className="mt-auto pt-4">
          <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200">
            Invite people
          </Button>
        </div>
      </div>
    </aside>
  );
};
