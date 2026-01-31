"use client";

import { useState } from "react";
import { useGetTeams } from "@/features/teams/api/use-get-teams";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useCreateTeamModal } from "@/features/teams/hooks/use-create-team-modal";
import { TeamAvatar } from "@/features/teams/components/team-avatar";
import { Button } from "@/components/ui/button";
import { Plus, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Team } from "@/features/teams/types";
import { useDeleteTeam } from "@/features/teams/api/use-delete-team";
import { useEditTeamModal } from "@/features/teams/hooks/use-edit-team-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { CreateTeamModal } from "@/features/teams/components/create-team-modal";
import { EditTeamModal } from "@/features/teams/components/edit-team-modal";

export const TeamsListClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: teams } = useGetTeams({ workspaceId });
  const { open: openCreateTeam } = useCreateTeamModal();
  const { open: openEditTeam } = useEditTeamModal();
  const { mutate: deleteTeam } = useDeleteTeam();

  const handleDelete = (team: Team) => {
    if (confirm(`Are you sure you want to delete "${team.name}"? This action cannot be undone.`)) {
      deleteTeam(
        {
          param: { teamId: team.$id },
        },
        {
          onSuccess: () => {
            // Success handled by toast in the hook
          },
        }
      );
    }
  };

  const handleEdit = (team: Team) => {
    openEditTeam(team.$id);
  };

  return (
    <>
      <CreateTeamModal />
      <EditTeamModal />
      <div className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All teams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and organize your workspace teams
          </p>
        </div>
        <Button onClick={openCreateTeam} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="size-4 mr-2" />
          Add new
        </Button>
      </div>

      <div className="flex-1 border rounded-lg bg-white shadow-sm">
        {!teams?.documents || teams.documents.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-4">No teams yet</p>
            <Button onClick={openCreateTeam} variant="outline">
              <Plus className="size-4 mr-2" />
              Create your first team
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Team name
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="text-left p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {teams.documents.map((team) => (
                  <tr key={team.$id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <TeamAvatar team={team} className="size-8" />
                        <span className="font-medium text-gray-900">{team.name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-700">
                        {team.description || <span className="text-muted-foreground">-</span>}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-sm text-gray-700">
                        {team.memberIds?.length || 0} {team.memberIds?.length === 1 ? "member" : "members"}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-700">
                      {team.$createdAt ? format(new Date(team.$createdAt), "d MMM yyyy") : "-"}
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(team)}>
                            <Pencil className="size-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(team)}
                            className="text-destructive"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </>
  );
};

