import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

interface CreateProjectRequest {
    form: {
        name: string;
        workspaceId: string;
        image?: File | string;
    }
}

export const useCreateProject = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        CreateProjectRequest
    >({
        mutationFn: async ({ form }) => {
            const { name, workspaceId } = form;

            const response = await api.post<any>(`/workspaces/${workspaceId}/projects`, {
                name,
            });

            // Map Backend (Python/SnakeCase) to Frontend (Appwrite/CamelCase)
            const data = {
                ...response,
                $id: response.id,
                $createdAt: response.created_at,
                $updatedAt: response.updated_at,
                workspaceId: response.workspace_id,
            };

            return { data };
        },
        onSuccess: () => {
            toast.success("Project created");
            queryClient.invalidateQueries({ queryKey: ["projects"] });
        },
        onError: () => {
            toast.error("Failed to create project");
        }
    });

    return mutation;
};
