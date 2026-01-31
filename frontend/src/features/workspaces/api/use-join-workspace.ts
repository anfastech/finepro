import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface JoinWorkspaceRequest {
    param: {
        workspaceId: string;
    },
    json: {
        inviteCode: string;
    }
}

export const useJoinWorkspace = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        JoinWorkspaceRequest
    >({
        mutationFn: async ({ param, json }) => {
            const response = await api.post<any>(`/workspaces/${param.workspaceId}/join`, null, {
                params: { inviteCode: json.inviteCode }
            });

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
            toast.success("Joined workspace successfully");
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            queryClient.invalidateQueries({ queryKey: ["workspace", data.$id] });
            router.push(`/workspaces/${data.$id}`);
        },
        onError: () => {
            toast.error("Failed to join workspace");
        }
    })

    return mutation;
};
