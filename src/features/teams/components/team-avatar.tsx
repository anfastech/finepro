"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Team } from "../types";

interface TeamAvatarProps {
  team: Team;
  className?: string;
  fallbackClassName?: string;
}

const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getColorFromName = (name: string, color?: string): string => {
  if (color) {
    return color;
  }
  // Generate a color based on team name
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-yellow-500",
  ];
  const index = name.length % colors.length;
  return colors[index];
};

export const TeamAvatar = ({
  team,
  className = "size-8",
  fallbackClassName = "text-xs",
}: TeamAvatarProps) => {
  if (team.imageUrl) {
    return (
      <div className={cn("rounded-full overflow-hidden", className)}>
        <Image
          src={team.imageUrl}
          alt={team.name}
          width={32}
          height={32}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  const initials = getInitials(team.name);
  const bgColor = getColorFromName(team.name, team.color);

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-medium",
        bgColor,
        className
      )}
    >
      <span className={fallbackClassName}>{initials}</span>
    </div>
  );
};

