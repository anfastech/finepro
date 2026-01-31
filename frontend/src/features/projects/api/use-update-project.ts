import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface UpdateProjectRequest {
    param: {
        projectId: string;
    };
    form: {
        name: string;
        image?: File | string;
    }
}

export const useUpdateProject = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        any,
        Error,
        UpdateProjectRequest
    >({
        mutationFn: async ({ form, param }) => {
            const response = await api.patch<any>(`/projects/${param.projectId}`, {
                name: form.name
            });

            // Map response to frontend format
            const data = {
                $id: response.id,
                $createdAt: response.created_at,
                $updatedAt: response.updated_at,
                name: response.name,
                workspaceId: response.workspace_id,
                imageUrl: "", // Not supported yet
            };

            return { data };
        },
        onSuccess: ({ data }) => {
            toast.success("Project updated");

            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["project", data.$id] });
        },
        onError: () => {
            toast.error("Failed to update project");
        }
    })

    return mutation;
};
