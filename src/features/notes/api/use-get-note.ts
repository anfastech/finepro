import { useQuery } from "@tanstack/react-query";
import { rpc } from "@/lib/rpc";
import { Note } from "../types";

interface useGetNoteProps {
  noteId: string;
}

export const useGetNote = ({ noteId }: useGetNoteProps) => {
  const query = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      const response = await rpc.api.notes[":noteId"].$get({
        param: { noteId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch note");
      }

      const { data } = await response.json();

      return data as Note;
    },
    enabled: !!noteId,
  });

  return query;
};

