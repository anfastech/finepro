import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { Note } from "../types";

interface useGetNotesProps {
  workspaceId: string;
  projectId?: string | null;
}

export const useGetNotes = ({ workspaceId, projectId }: useGetNotesProps) => {
  const query = useQuery({
    queryKey: ["notes", workspaceId, projectId],
    queryFn: async () => {
      const response = await rpc.api.notes.$get({
        query: {
          workspaceId,
          projectId: projectId ?? undefined,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notes");
      }

      const { data } = await response.json();
      const notes: Note[] = data?.documents ?? [];

      return notes;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  return query;
};

