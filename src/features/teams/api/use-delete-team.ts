import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.teams[":teamId"]["$delete"], 200>;
type RequestType = InferRequestType<typeof rpc.api.teams[":teamId"]["$delete"]>;

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ param }) => {
      const response = await rpc.api.teams[":teamId"]["$delete"]({ param });

      if (!response.ok) {
        throw new Error("Failed to delete team");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Team deleted");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", data.$id] });
    },
    onError: () => {
      toast.error("Failed to delete team");
    },
  });

  return mutation;
};

