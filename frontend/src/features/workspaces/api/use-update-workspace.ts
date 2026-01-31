import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface UpdateWorkspaceRequest {
    form: {
        name: string;
        image?: File | string;
    },
    param: {
        workspaceId: string;
    }
}

export const useUpdateWorkspace = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        UpdateWorkspaceRequest
    >({
        mutationFn: async ({ form, param }) => {
            const response = await api.patch<any>(`/workspaces/${param.workspaceId}`, {
                name: form.name,
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
            toast.success("Workspace updated successfully");

            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            queryClient.invalidateQueries({ queryKey: ["workspace", data.$id] });
        },
        onError: () => {
            toast.error("Failed to update workspace");
        }
    })

    return mutation;
};
