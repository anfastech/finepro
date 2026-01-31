import { useQuery } from "@tanstack/react-query";
import { Models } from "node-appwrite";

import { api } from "@/lib/api";
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

      // Fetch from FastAPI backend
      // Backend expects workspace_id filter.
      const data = await api.get<any[]>(`/workspaces/${workspaceId}/projects`);

      if (!data) {
        return { documents: [], total: 0 };
      }

      // Map Backend (Python/SnakeCase) to Frontend (Appwrite/CamelCase)
      const documents = data.map((project: any) => ({
        $id: project.id,
        $createdAt: project.created_at,
        $updatedAt: project.updated_at,
        $collectionId: "projects",
        $databaseId: "finepro",
        $permissions: [],

        name: project.name,
        imageUrl: "", // Backend doesn't support project images yet
        workspaceId: project.workspace_id,
        description: project.description,
        status: project.status
      })) as Project[];

      return {
        documents,
        total: documents.length
      };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return query;
};