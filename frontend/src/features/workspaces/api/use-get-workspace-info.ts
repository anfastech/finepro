import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface useGetWorkspaceInfoProps {
    workspaceId: string;
}

export const useGetWorkspaceInfo = ({
    workspaceId,
}: useGetWorkspaceInfoProps) => {
    const query = useQuery({
        queryKey: ["workspace-info", workspaceId],
        queryFn: async () => {
            const data = await api.get<any>(`/workspaces/${workspaceId}/info`);

            if (!data) return null;

            // Adapt status for frontend
            return {
                ...data,
                $id: data.id,
                $createdAt: data.created_at,
                $updatedAt: data.updated_at,
            };
        }
    });

    return query;
};