import { useQuery } from "@tanstack/react-query";
import { Models } from "node-appwrite";

import { rpc } from "@/lib/rpc";
import { Team } from "../types";

interface useGetTeamsProps {
  workspaceId?: string;
  enabled?: boolean;
}

export const useGetTeams = ({
  workspaceId,
  enabled,
}: useGetTeamsProps) => {
  const query = useQuery<Models.DocumentList<Team>>({
    queryKey: ["teams", workspaceId],
    enabled: enabled ?? Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) throw new Error("Missing workspaceId");

      const response = await rpc.api.teams.$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch teams");
      }

      const { data } = await response.json();

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  return query;
};

