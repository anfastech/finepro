import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface useGetWorkspaceProps {
    workspaceId: string;
}

export const useGetWorkspace = ({
    workspaceId,
}: useGetWorkspaceProps) => {
    const query = useQuery({
        queryKey: ["workspace", workspaceId],
        queryFn: async () => {
            const data = await api.get<any>(`/workspaces/${workspaceId}`);

            if (!data) return null;

            // Adapt FastAPI to Frontend Supabase types
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