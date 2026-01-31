import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface CreateWorkspaceRequest {
    form: {
        name: string;
        image?: File | string;
    }
}

export const useCreateWorkspace = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        CreateWorkspaceRequest
    >({
        mutationFn: async ({ form }) => {
            const response = await api.post<any>("/workspaces/", {
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
        onSuccess: () => {
            toast.success("Workspace created");
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        },
        onError: () => {
            toast.error("Failed to create workspace");
        }
    })

    return mutation;
};
