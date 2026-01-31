import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { Task, TaskStatus } from "../types";

// Helper to check if a valid status enum
const isValidStatus = (status: string): status is TaskStatus => {
    return Object.values(TaskStatus).includes(status as TaskStatus);
}

interface useGetTaskProps {
    taskId: string;
}

export const useGetTask = ({
    taskId,
}: useGetTaskProps) => {
    const query = useQuery({
        queryKey: ["task", taskId],
        queryFn: async () => {
            const task = await api.get<any>(`/tasks/${taskId}`);

            if (!task) throw new Error("Task not found");

            // Map to frontend format
            const data: Task = {
                $id: task.id,
                $createdAt: task.created_at,
                $updatedAt: task.updated_at,
                $collectionId: "tasks",
                $databaseId: "finepro",
                $permissions: [],

                name: task.title,
                status: isValidStatus(task.status) ? task.status : TaskStatus.TODO,
                workspaceId: "", // Backend task response doesn't always have workspace info directly, might need to fetch or infer
                projectId: task.project_id || "",
                assigneeId: task.assigned_to || "",
                position: task.position || 0,
                dueDate: task.due_date || "",
                description: task.description,
                priority: task.priority,

                project: { name: "Project" }, // Placeholder
                assignee: { name: "Unassigned" } // Placeholder
            } as unknown as Task;

            return data;
        }
    });

    return query;
}