import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { TaskStatus } from "../types";

interface UpdateTaskRequest {
    param: {
        taskId: string;
    };
    json: {
        name?: string;
        status?: TaskStatus;
        projectId?: string;
        assigneeId?: string;
        dueDate?: Date;
        description?: string;
    };
}

export const useUpdateTask = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        any,
        Error,
        UpdateTaskRequest
    >({
        mutationFn: async ({ json, param }) => {
            const { taskId } = param;
            const { name, status, assigneeId, dueDate, description } = json;

            // Map frontend fields (camelCase) to backend fields (snake_case)
            const updateData: any = {};
            if (name !== undefined) updateData.title = name;
            if (status !== undefined) updateData.status = status;
            if (assigneeId !== undefined) updateData.assigned_to = assigneeId;
            if (dueDate !== undefined) updateData.due_date = dueDate ? dueDate.toISOString() : null;
            if (description !== undefined) updateData.description = description;

            const response = await api.patch<{ id: string; [key: string]: any }>(`/tasks/${taskId}`, updateData);

            if (!response) throw new Error("Update failed");

            // return response mapped to frontend if needed, or just the raw response
            // Frontend usually expects { data: { $id: ... } } structure for consistency
            return {
                data: {
                    $id: response.id,
                    ...response
                }
            };
        },
        onSuccess: ({ data }) => {
            toast.success("Task updated");

            queryClient.invalidateQueries({ queryKey: ["project-analytics"] });
            queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["task", data.$id] });
        },
        onError: () => {
            toast.error("Failed to update task");
        }
    })

    return mutation;
};
