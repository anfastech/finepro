import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
// FIX: ProjectResponse may not be exported from types; use a plain type instead
// import { ProjectResponse } from "@/features/projects/types";

interface Project {
    id: string;
    name: string;
    workspace_id: string;
    image_url?: string;
    // Add other fields returned by your API if necessary
}

interface CreateProjectRequest {
    name: string;
    workspaceId: string;
    image?: File | string;
}

export const useCreateProject = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<Project, Error, CreateProjectRequest>({
        mutationFn: async ({ name, workspaceId, image }) => {
            let formData: FormData | undefined = undefined;

            // If there's an image and it's a File, use FormData for proper uploading
            if (image instanceof File) {
                formData = new FormData();
                formData.append("name", name);
                formData.append("image", image);
            }

            const url = `/workspaces/${workspaceId}/projects`;

            // If FormData is used, set headers accordingly; else, send JSON
            const response = formData
                ? await api.post<Project>(url, formData)
                : await api.post<Project>(url, { name, image: typeof image === "string" ? image : undefined });

            return response;
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
