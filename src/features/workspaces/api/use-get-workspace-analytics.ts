import { useQuery } from "@tanstack/react-query";

import { rpc } from "@/lib/rpc";
import { InferResponseType } from "hono";

interface useGetWorkspaceAnalyticsProps {
    workspaceId: string;
}

export type WorkspaceAnalyticsResponseType = InferResponseType<typeof rpc.api.workspaces[":workspaceId"]["analytics"]["$get"], 200>;

export const useGetWorkspaceAnalytics = ({
    workspaceId,
}: useGetWorkspaceAnalyticsProps) => {
    const query = useQuery({
        queryKey: ["workspace-analytics", workspaceId],
        queryFn: async () => {
            const response = await rpc.api.workspaces[":workspaceId"]["analytics"].$get({
                param: { workspaceId },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch workspace analytics");
            }

            const { data } = await response.json();

            return data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes - analytics can be slightly stale
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    });

    return query;

}