import { useQuery } from "@tanstack/react-query";
import { Models } from "node-appwrite";

import { rpc } from "@/lib/rpc";
import { Project } from "../types";

interface useGetProjectsProps {
  workspaceId?: string;
  enabled?: boolean;
}

export const useGetProjects = ({
  workspaceId,
  enabled,
}: useGetProjectsProps) => {
  const query = useQuery<Models.DocumentList<Project>>({
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
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - projects don't change often
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  });

  return query;
};