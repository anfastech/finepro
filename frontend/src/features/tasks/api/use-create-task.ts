import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { TaskStatus } from "../types";

interface CreateTaskRequest {
    json: {
        name: string;
        status: TaskStatus;
        workspaceId: string;
        projectId: string;
        dueDate: Date;
        assigneeId: string;
    }
}

export const useCreateTask = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        CreateTaskRequest
    >({
        mutationFn: async ({ json }) => {
            const { projectId, name, status, assigneeId, dueDate } = json;

            if (!projectId) throw new Error("Project ID is required");

            const response = await api.post<any>(`/projects/${projectId}/tasks`, {
                title: name,
                status: status,
                assigned_to: assigneeId,
                due_date: dueDate ? dueDate.toISOString() : null,
            });

            // Adapt backend response to frontend format
            const data = {
                ...response,
                $id: response.id,
                $createdAt: response.created_at,
                $updatedAt: response.updated_at,
                projectId: response.project_id,
                assigneeId: response.assigned_to,
            };

            return { data };
        },
        onSuccess: () => {
            toast.success("Task created");
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["project-analytics"] });
            queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
        },
        onError: () => {
            toast.error("Failed to create task");
        }
    })

    return mutation;
};
