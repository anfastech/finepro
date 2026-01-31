import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface DeleteProjectRequest {
    param: {
        projectId: string;
    }
}

export const useDeleteProject = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        any,
        Error,
        DeleteProjectRequest
    >({
        mutationFn: async ({ param }) => {
            await api.delete(`/projects/${param.projectId}`);
            // Backend returns 204 No Content
            // Return mock data for onSuccess compatibility
            return { data: { $id: param.projectId } };
        },
        onSuccess: ({ data }) => {
            toast.success("Project deleted");

            queryClient.invalidateQueries({ queryKey: ["projects"] });
            queryClient.invalidateQueries({ queryKey: ["project", data.$id] });
        },
        onError: () => {
            toast.error("Failed to delete project");
        }
    })

    return mutation;
};
