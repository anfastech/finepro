import { useQuery } from "@tanstack/react-query";

import { rpc } from "@/lib/rpc";

interface useGetMembersProps {
    workspaceId: string;
};

export const useGetMembers = ({ 
    workspaceId,
 }: useGetMembersProps) => {
    const query = useQuery({
        queryKey: ["members", workspaceId],
        queryFn: async () => {
            const response = await rpc.api.members.$get({ query: { workspaceId }});

            if (!response.ok) {
                throw new Error("Failed to fetch members");
            }

            const { data } = await response.json();

            return data;
        },
        staleTime: 10 * 60 * 1000, // 10 minutes - members don't change often
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    });

    return query;

}