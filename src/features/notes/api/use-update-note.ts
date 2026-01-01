import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.notes[":noteId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof rpc.api.notes[":noteId"]["$patch"]>;

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param }) => {
      const response = await rpc.api.notes[":noteId"]["$patch"]({ json, param });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      return await response.json();
    },
    onSuccess: (res) => {
      if ("data" in res) {
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        queryClient.invalidateQueries({ queryKey: ["note", res.data.$id] });
      } else {
        toast.error("Failed to update note");
      }
    },
    onError: () => {
      toast.error("Failed to update note");
    },
  });

  return mutation;
};

