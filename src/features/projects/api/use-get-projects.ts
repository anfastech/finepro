import { useQuery } from "@tanstack/react-query";

import { rpc } from "@/lib/rpc";

interface useGetProjectsProps {
    workspaceId?: string;
    enabled?: boolean;
}

export const useGetProjects = ({
    workspaceId,
    enabled,
}: useGetProjectsProps) => {
    const query = useQuery({
        queryKey: ["projects", workspaceId],
        enabled: enabled ?? Boolean(workspaceId),
        queryFn: async () => {
            if (!workspaceId) throw new Error("Missing workspaceId");

            const response = await rpc.api.projects.$get({
                query: { workspaceId },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch projects");
            }

            const { data } = await response.json();

            return data;
        }
    });

    return query;

}