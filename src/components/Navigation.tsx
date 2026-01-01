"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SettingsIcon, UsersIcon, FileText } from "lucide-react";
import { GoCheckCircle, GoCheckCircleFill, GoHome, GoHomeFill } from "react-icons/go";

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";

import { cn } from "@/lib/utils";

const routes = [
    {
        label: "Home",
        href: "",
        icon: GoHome,
        activeIcon: GoHomeFill,
    },
    {
        label: "My Task",
        href: "/tasks",
        icon: GoCheckCircle,
        activeIcon: GoCheckCircleFill,
    },
    {
        label: "Projects",
        href: "/projects-list",
        icon: SettingsIcon,
        activeIcon: SettingsIcon,
    },
    {
        label: "Notes",
        href: "/notes",
        icon: FileText,
        activeIcon: FileText,
    },
    {
        label: "Settings",
        href: "/settings",
        icon: SettingsIcon,
        activeIcon: SettingsIcon,
    },
    {
        label: "Members",
        href: "/members",
        icon: UsersIcon,
        activeIcon: UsersIcon,
    }
];

export const Navigation = () => {
    const workspaceId = useWorkspaceId();
    const pathname = usePathname();

    return (
        <div className="flex flex-col">
            {routes.map((item) => {
                const fullHref = `/workspaces/${workspaceId}${item.href}`;
                const isActive = pathname === fullHref;
                const Icon = isActive ? item.activeIcon : item.icon;

                return (
                    <Link key={item.href} href={fullHref}>
                        <div className={cn(
                            "flex items-center gap-2.5 p-2.5 rounded-md font-medium transition text-neutral-300 hover:text-white hover:bg-white/10",
                            isActive && "bg-white/20 text-white"
                        )}>
                            <Icon className="size-5" />
                            <span>{item.label}</span>
                        </div>
                    </Link>
                )
            })}
        </div>
    );
};