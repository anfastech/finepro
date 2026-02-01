import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Fetches teams for a given workspace from Supabase.
 * 
 * - Properly types team and hook response.
 * - Adds robust error handling.
 * - Removes invalid/unused return value.
 */

interface Team {
  id: string;
  name: string;
  workspace_id: string;
  created_at?: string;
  // Add other fields as needed.
}

interface useGetTeamsProps {
  workspaceId?: string;
  enabled?: boolean;
}

interface UseGetTeamsResult {
  data: Team[];
  total: number;
}

export const useGetTeams = ({
  workspaceId,
  enabled,
}: useGetTeamsProps) => {
  return useQuery<UseGetTeamsResult, Error>({
    queryKey: ["teams", workspaceId],
    enabled: typeof enabled === "boolean" ? enabled : Boolean(workspaceId),
    queryFn: async () => {
      if (!workspaceId) throw new Error("Missing workspaceId");

      const { data, error } = await supabase
        .from<Team>("teams")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message || "Failed to fetch teams");
      }
      return {
        data: data ?? [],
        total: data?.length ?? 0,
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
