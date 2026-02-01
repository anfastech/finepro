import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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
            const { data: members, error } = await supabase
                .from('members')
                .select(`
                    *,
                    user:users(name, email)
                `)
                .eq('workspace_id', workspaceId);

            if (error) {
                throw new Error(error.message);
            }

            // Map to frontend format
            const documents = members.map((m: any) => ({
                id: m.id,
                $id: m.id,
                created_at: m.joined_at,
                updated_at: m.joined_at,
                $createdAt: m.joined_at,
                $updatedAt: m.joined_at,
                $collectionId: "members",
                $databaseId: "finepro",
                $permissions: [],

                workspaceId: m.workspace_id,
                userId: m.user_id,
                role: m.role,
                name: m.user?.name || "Unknown",
                email: m.user?.email || "",
            })) as any;

            return {
                documents: documents as any,
                total: documents.length,
            };
        }
    });

    return query;
};