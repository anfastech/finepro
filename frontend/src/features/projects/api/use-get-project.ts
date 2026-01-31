import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Project } from "../types";

interface useGetProjectProps {
    projectId: string;
}

export const useGetProject = ({
    projectId,
}: useGetProjectProps) => {
    const query = useQuery({
        queryKey: ["project", projectId],
        queryFn: async () => {
            const project = await api.get<any>(`/projects/${projectId}`);

            if (!project) {
                throw new Error("Project not found");
            }

            // Map to frontend format
            const data: Project = {
                $id: project.id,
                $createdAt: project.created_at,
                $updatedAt: project.updated_at,
                $collectionId: "projects",
                $databaseId: "finepro",
                $permissions: [],

                name: project.name,
                workspaceId: project.workspace_id,
                imageUrl: "", // Not supported yet
                // casting to any to avoid strict type checks on missing Properties from Models.Document
            } as any;

            return data;
        }
    });

    return query;
}