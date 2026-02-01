import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.teams[":teamId"]["members"]["$delete"], 200>;
type RequestType = InferRequestType<typeof rpc.api.teams[":teamId"]["members"]["$delete"]>;

export const useRemoveTeamMembers = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json, param }) => {
      const response = await rpc.api.teams[":teamId"]["members"]["$delete"]({ json, param });

      if (!response.ok) {
        throw new Error("Failed to remove team members");
      }

      return await response.json();
    },
    onSuccess: (_, variables) => {
      toast.success("Members removed from team");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", variables.param.teamId] });
    },
    onError: () => {
      toast.error("Failed to remove team members");
    },
  });

  return mutation;
};

