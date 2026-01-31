import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ProjectAnalyticsResponseType {
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
    // Kept for backward compatibility
    project_id?: string;
    period_days?: number;
}

interface useGetProjectAnalyticsProps {
    projectId: string;
}

export const useGetProjectAnalytics = ({
    projectId,
}: useGetProjectAnalyticsProps) => {
    const query = useQuery({
        queryKey: ["project-analytics", projectId],
        queryFn: async () => {
            const data = await api.get<ProjectAnalyticsResponseType>(`/projects/${projectId}/analytics`);

            if (!data) {
                throw new Error("Failed to fetch project analytics");
            }

            return data;
        }
    });

    return query;
}