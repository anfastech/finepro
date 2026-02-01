import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Task, TaskStatus } from "../types";

// Helper to check if a valid status enum
const isValidStatus = (status: string): status is TaskStatus => {
    return Object.values(TaskStatus).includes(status as TaskStatus);
}

interface useGetTasksProps {
    workspaceId: string;
    projectId?: string | null;
    status?: TaskStatus | null;
    assigneeId?: string | null;
    search?: string | null;
    dueDate?: string | null;
}

export const useGetTasks = ({
    workspaceId,
    projectId,
    status,
    assigneeId,
    search,
    dueDate,
}: useGetTasksProps) => {
    const query = useQuery({
        queryKey: ["tasks", workspaceId, projectId, status, search, assigneeId, dueDate],
        queryFn: async () => {
            let query = supabase
                .from('tasks')
                .select(`
                    *,
                    project:projects(name),
                    assigned_user:users(name, avatar_url)
                `);

            // Always filter by workspace
            if (projectId) {
                query = query.eq('project_id', projectId);
            } else {
                // If no project, get all tasks in workspace via projects
                const { data: projects } = await supabase
                    .from('projects')
                    .select('id')
                    .eq('workspace_id', workspaceId);

                if (projects && projects.length > 0) {
                    const projectIds = projects.map(p => p.id);
                    query = query.in('project_id', projectIds);
                } else {
                    return { documents: [], total: 0 };
                }
            }

            // Apply filters
            if (status) query = query.eq('status', status);
            if (assigneeId) query = query.eq('assigned_to', assigneeId);
            if (search) query = query.ilike('title', `%${search}%`);
            if (dueDate) query = query.gte('due_date', dueDate);

            const { data: tasks, error } = await query.order('position', { ascending: true });

            if (error) {
                throw new Error(error.message);
            }

            const documents = tasks.map((task: any) => ({
                id: task.id,
                $id: task.id,
                created_at: task.created_at,
                updated_at: task.updated_at,
                $createdAt: task.created_at,
                $updatedAt: task.updated_at,

                name: task.title,
                status: isValidStatus(task.status) ? task.status : TaskStatus.TODO,
                workspaceId: workspaceId,
                projectId: task.project_id,
                assigneeId: task.assigned_to || "",
                position: task.position || 0,
                dueDate: task.due_date || "",
                description: task.description,
                priority: task.priority,

                project: task.project ? {
                    name: task.project.name,
                    imageUrl: task.project.image_url || task.project.imageUrl || ""
                } : { name: "Unknown Project", imageUrl: "" },
                assignee: task.assigned_user ? {
                    name: task.assigned_user.name,
                    avatarColor: task.assigned_user.avatar_color || { bg: "bg-gray-100", text: "text-gray-700" }
                } : { name: "Unassigned" }
            })) as Task[];

            return {
                documents,
                total: documents.length
            };
        }
    });

    return query;
};