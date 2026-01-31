import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface useGetWorkspaceAnalyticsProps {
    workspaceId: string;
}

export interface WorkspaceAnalyticsResponseType {
    taskCount: number;
    taskDifference: number;
    assignedTaskCount: number;
    assignedTaskDifference: number;
    completedTaskCount: number;
    completedTaskDifference: number;
    overdueTaskCount: number;
    overdueTaskDifference: number;
    incompleteTaskCount: number;
    incompleteTaskDifference: number;
}

export const useGetWorkspaceAnalytics = ({
    workspaceId,
}: useGetWorkspaceAnalyticsProps) => {
    const query = useQuery({
        queryKey: ["workspace-analytics", workspaceId],
        queryFn: async () => {
            const data = await api.get<{ data: WorkspaceAnalyticsResponseType }>(`/workspaces/${workspaceId}/analytics`);

            if (!data) {
                throw new Error("Failed to fetch workspace analytics");
            }

            return data.data;
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    return query;
};