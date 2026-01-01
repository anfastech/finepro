"use client";

import { useState } from "react";
import { RiAddCircleFill } from "react-icons/ri";
import { ChevronDown, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const teams = [
  { id: "1", name: "Marketing" },
  { id: "2", name: "Design" },
  { id: "3", name: "Development" },
];

export const Teams = () => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase text-neutral-400">Teams</p>
        <RiAddCircleFill className="size-5 text-neutral-400 cursor-pointer hover:opacity-75 transition" />
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-neutral-300 hover:text-white transition"
      >
        {isExpanded ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        <span className="text-sm">Teams</span>
      </button>
      {isExpanded && (
        <div className="flex flex-col gap-y-1 pl-6">
          {teams.map((team) => (
            <button
              key={team.id}
              className={cn(
                "flex items-center gap-2.5 p-2 rounded-md text-sm text-neutral-300 hover:bg-sidebar-accent hover:text-white transition text-left"
              )}
            >
              <span>{team.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

