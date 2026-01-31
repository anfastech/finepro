"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RiAddCircleFill } from "react-icons/ri";

import { cn } from "@/lib/utils";
import { useGetTeams } from "@/features/teams/api/use-get-teams";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { TeamAvatar } from "@/features/teams/components/team-avatar";
import { useCreateTeamModal } from "@/features/teams/hooks/use-create-team-modal";

export const Teams = () => {
  const pathname = usePathname();
  const { open } = useCreateTeamModal();
  const workspaceId = useWorkspaceId();
  const { data } = useGetTeams({ workspaceId });

  const teams = data?.documents || [];

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase text-neutral-400">TEAMS</p>
        <RiAddCircleFill
          onClick={open}
          className="size-5 text-neutral-400 cursor-pointer hover:opacity-75 transition"
        />
      </div>
      <div className="flex flex-col gap-y-1">
        {teams.length === 0 ? (
          <p className="text-xs text-neutral-400 px-2 py-1">No teams yet</p>
        ) : (
          teams.map((team) => {
            const isActive = pathname?.includes(`/teams/${team.$id}`) || pathname?.includes("/teams-list");
            return (
              <Link
                key={team.$id}
                href={`/workspaces/${workspaceId}/teams-list`}
                className={cn(
                  "flex items-center gap-2.5 p-2 rounded-md text-sm transition-all duration-200 cursor-pointer text-left",
                  "text-neutral-300 hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/20 text-white"
                )}
              >
                <TeamAvatar team={team} className="size-4" />
                <span className="truncate">{team.name}</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
};

