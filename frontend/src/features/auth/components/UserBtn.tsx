"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DottedSeparator } from "@/components/dotted-separator";

import { useLogout } from "../api/use-logout";
import { useCurrent } from "../api/use-current";
import { Loader, LogOut, Settings } from "lucide-react";
import { useState } from "react";
import { EditNameDialog } from "./EditNameDialog";
import { ChangePasswordDialog } from "./ChangePasswordDialog";
import { UserSettingsDialog } from "./UserSettingsDialog";

// Extended color palette with light backgrounds and darker text
const avatarColors = [
    { bg: "bg-blue-100", text: "text-blue-700" },
    { bg: "bg-green-100", text: "text-green-700" },
    { bg: "bg-purple-100", text: "text-purple-700" },
    { bg: "bg-pink-100", text: "text-pink-700" },
    { bg: "bg-orange-100", text: "text-orange-700" },
    { bg: "bg-indigo-100", text: "text-indigo-700" },
    { bg: "bg-teal-100", text: "text-teal-700" },
    { bg: "bg-red-100", text: "text-red-700" },
    { bg: "bg-yellow-100", text: "text-yellow-700" },
    { bg: "bg-cyan-100", text: "text-cyan-700" },
    { bg: "bg-amber-100", text: "text-amber-700" },
    { bg: "bg-emerald-100", text: "text-emerald-700" },
    { bg: "bg-violet-100", text: "text-violet-700" },
    { bg: "bg-rose-100", text: "text-rose-700" },
    { bg: "bg-sky-100", text: "text-sky-700" },
    { bg: "bg-lime-100", text: "text-lime-700" },
];

// Generate consistent color from name (fallback for users without stored color)
const getAvatarColorFromName = (name: string) => {
    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const UserBtn = () => {
  const { data: user, isLoading } = useCurrent();
  const { mutate: logout } = useLogout();
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [userSettingsOpen, setUserSettingsOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="size-10 rounded-full flex items-center justify-center bg-neutral-200 border border-neutral-300">
        <Loader className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

const name = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const email = user?.email;
  const prefs = user?.user_metadata?.prefs;
  const displayName = name || email || "User";

  const avatarfallback = displayName.charAt(0).toUpperCase();

  // Get avatar color from user preferences or generate from name
  const userPrefs = prefs as { avatarColor?: { bg: string; text: string } } | undefined;
  const avatarColor = userPrefs?.avatarColor || getAvatarColorFromName(displayName);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger className="outline-none relative">
          <Avatar className="size-10 hover:opacity-75 transition border border-neutral-300">
            <AvatarFallback className={cn(
              `${avatarColor.bg} ${avatarColor.text} font-medium flex items-center justify-center`
            )}>
              {avatarfallback}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          className="w-60"
          sideOffset={10}
        >
          <div className="flex flex-col items-center justify-center gap-2 px-2.5 py-4">
            <Avatar className="size-[52px] hover:opacity-75 transition border border-neutral-300">
              <AvatarFallback className={cn(
                `${avatarColor.bg} ${avatarColor.text} text-xl font-medium flex items-center justify-center`
              )}>
                {avatarfallback}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center justify-center gap-1">
              <p className="text-sm font-medium text-neutral-900">
                  {displayName}
              </p>
              <p className="text-xs text-neutral-500">
                  {email}
              </p>
            </div>
          </div>
          <DottedSeparator className="mb-1" />
          <DropdownMenuItem 
              onClick={() => setUserSettingsOpen(true)}
              className="h-10 flex items-center justify-center text-neutral-700 font-medium cursor-pointer"
          >
              <Settings className="size-4 mr-2" />
              User Settings
          </DropdownMenuItem>
          <DropdownMenuItem 
              onClick={() => logout()}
              className="h-10 flex items-center justify-center text-amber-700 font-medium cursor-pointer"
          >
              <LogOut className="size-4 mr-2" />
              Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EditNameDialog 
        open={editNameOpen} 
        onOpenChange={setEditNameOpen}
        currentName={name || ""}
      />
      <ChangePasswordDialog 
        open={changePasswordOpen} 
        onOpenChange={setChangePasswordOpen}
      />
      <UserSettingsDialog
        open={userSettingsOpen}
        onOpenChange={setUserSettingsOpen}
        currentName={name || ""}
      />
    </>
  );
};
