import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
            const { data: task, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    project:projects(name),
                    assigned_user:users(name, avatar_url)
                `)
                .eq('id', taskId)
                .single();

            if (error || !task) {
                throw new Error("Task not found");
            }

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
                workspaceId: "", // Will be populated if needed
                projectId: task.project_id || "",
                assigneeId: task.assigned_to || "",
                position: task.position || 0,
                dueDate: task.due_date || "",
                description: task.description,
                priority: task.priority,

                project: task.project || { 
    $id: "unknown",
    $createdAt: "",
    $updatedAt: "",
    $collectionId: "projects",
    $databaseId: "finepro",
    $permissions: [],
    name: "Unknown Project",
    imageUrl: "",
    workspaceId: ""
},
                assignee: task.assigned_user ? {
                    name: task.assigned_user.name,
                    avatarColor: task.assigned_user.avatar_color || { bg: "bg-gray-100", text: "text-gray-700" }
                } : { name: "Unassigned" }
            };

            return data;
        }
    });

    return query;
}