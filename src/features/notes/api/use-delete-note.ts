import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.notes[":noteId"]["$delete"], 200>;
type RequestType = InferRequestType<typeof rpc.api.notes[":noteId"]["$delete"]>;

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const response = await rpc.api.notes[":noteId"]["$delete"]({ param });

      if (!response.ok) {
        throw new Error("Failed to delete note");
      }

      return await response.json();
    },
    onSuccess: (res, variables) => {
      if ("data" in res) {
        toast.success("Note deleted");
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.removeQueries({ queryKey: ["note", variables.param.noteId] });
      } else {
        toast.error("Failed to delete note");
      }
    },
    onError: () => {
      toast.error("Failed to delete note");
    },
  });

  return mutation;
};

