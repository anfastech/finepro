"use client";

import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { CreateTeamForm } from "./create-team-form";

interface CreateTeamFormWrapperProps {
    onCancel: () => void;
}

export const CreateTeamFormWrapper = ({ onCancel }: CreateTeamFormWrapperProps) => {
    const workspaceId = useWorkspaceId();
    const { data: members } = useGetMembers({ workspaceId });

    const memberOptions = members?.documents.map((member: any) => ({
        id: member.$id || member.id,
        name: member.name || member.email || "",
        avatarColor: member.avatarColor || member.avatar_color,
    })) || [];

    return (
        <CreateTeamForm
            onCancel={onCancel}
            memberOptions={memberOptions}
        />
    );
};

