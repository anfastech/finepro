import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface ResetInviteCodeRequest {
    param: {
        workspaceId: string;
    }
}

export const useResetInviteCode = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        ResetInviteCodeRequest
    >({
        mutationFn: async ({ param }) => {
            const response = await api.post<any>(`/workspaces/${param.workspaceId}/reset-invite-code`, {});

            // Adapt backend response to frontend format
            const data = {
                ...response,
                $id: response.id,
                $createdAt: response.created_at,
                $updatedAt: response.updated_at,
            };

            return { data };
        },
        onSuccess: ({ data }) => {
            toast.success("Invite code reset");
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            queryClient.invalidateQueries({ queryKey: ["workspace", data.$id] });
        },
        onError: () => {
            toast.error("Failed to reset invite code");
        }
    })

    return mutation;
};
