import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { Member } from "../types";

interface useGetMembersProps {
    workspaceId: string;
};

export const useGetMembers = ({
    workspaceId,
}: useGetMembersProps) => {
    const query = useQuery({
        queryKey: ["members", workspaceId],
        queryFn: async () => {
            const data = await api.get<any[]>(`/members/workspaces/${workspaceId}/members`);

            if (!data) {
                return { documents: [], total: 0 };
            }

            // Map Backend (Python/SnakeCase) to Frontend (Appwrite/CamelCase)
            const documents = data.map((m: any) => ({
                $id: m.id,
                $createdAt: m.joined_at,
                $updatedAt: m.joined_at, // Use joined_at as fallback
                $collectionId: "members",
                $databaseId: "finepro",
                $permissions: [],

                workspaceId: m.workspace_id,
                userId: m.user_id,
                role: m.role,
                name: m.user?.name || "Unknown",
                email: m.user?.email || "",
            })) as Member[];

            return {
                documents,
                total: documents.length
            };
        },
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    return query;
}