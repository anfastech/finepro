"use client";

import { useGetTeam } from "@/features/teams/api/use-get-team";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { EditTeamForm } from "./edit-team-form";

interface EditTeamFormWrapperProps {
  teamId: string;
  onCancel: () => void;
}

export const EditTeamFormWrapper = ({ teamId, onCancel }: EditTeamFormWrapperProps) => {
  const workspaceId = useWorkspaceId();
  const { data: team, isLoading } = useGetTeam({ teamId });
  const { data: members } = useGetMembers({ workspaceId });

  if (isLoading || !team) {
    return <div className="p-8">Loading...</div>;
  }

  const memberOptions = members?.documents.map((member) => ({
    id: member.$id,
    name: member.name || member.email || "",
    avatarColor: member.avatarColor,
  })) || [];

  return (
    <EditTeamForm
      onCancel={onCancel}
      initialValues={team}
      memberOptions={memberOptions}
    />
  );
};

