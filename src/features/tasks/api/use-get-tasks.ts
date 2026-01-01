import { useQuery } from "@tanstack/react-query";

import { rpc } from "@/lib/rpc";
import { Task, TaskStatus } from "../types";

interface useGetTasksProps {
    workspaceId: string;
    projectId?: string | null;
    status?: TaskStatus | null;
    search?: string | null;
    assigneeId?: string | null;
    dueDate?: string | null;
}

export const useGetTasks = ({
    workspaceId,
    projectId,
    status,
    search,
    assigneeId,
    dueDate
}: useGetTasksProps) => {
    const query = useQuery({
        queryKey: [
            "tasks",
            workspaceId,
            projectId,
            status,
            search,
            assigneeId,
            dueDate
        ],
        queryFn: async () => {
            const response = await rpc.api.tasks.$get({
                query: {
                    workspaceId,
                    projectId: projectId ?? undefined,
                    status: status ?? undefined,
                    search: search ?? undefined,
                    assigneeId: assigneeId ?? undefined,
                    dueDate: dueDate ?? undefined
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch tasks");
            }

            const raw = await response.json();

            // TODO: Not best pratice, we wanna optimize this reponse and make it faster
            const tasks: Task[] = raw.documents ?? [];

            return tasks;
        },
        staleTime: 1 * 60 * 1000, // 1 minute - tasks change more frequently
        gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    });

    return query;

}