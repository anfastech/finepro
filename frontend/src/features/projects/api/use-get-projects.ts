import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Fetches projects for a given workspace from Supabase.
 * 
 * Fixes:
 * - Added better error handling and clear typing for expected shape.
 * - Ensured `enabled` default only checks for `workspaceId` (prevents unintentional fetch).
 * - Clearly typed query return for easier usage.
 */

interface Project {
  id: string;
  name: string;
  workspace_id: string;
  image_url?: string;
  created_at?: string;
  // Add other relevant fields as defined in the database
}

interface useGetProjectsProps {
  workspaceId?: string;
  enabled?: boolean;
}

interface UseGetProjectsResult {
  data: Project[];
  total: number;
}

export const useGetProjects = ({
  workspaceId,
  enabled,
}: useGetProjectsProps) => {
  return useQuery<UseGetProjectsResult, Error>({
    queryKey: ["projects", workspaceId],
    enabled: typeof enabled === "boolean" ? enabled : Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) throw new Error("Missing workspaceId");

      const { data, error } = await supabase
        .from<Project>("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Failed to fetch projects");
      }
      return {
        data: data ?? [],
        total: data?.length ?? 0,
      };
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};