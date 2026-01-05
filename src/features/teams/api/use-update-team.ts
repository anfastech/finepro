import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.teams[":teamId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof rpc.api.teams[":teamId"]["$patch"]>;

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ form, param }) => {
      const response = await rpc.api.teams[":teamId"]["$patch"]({ form, param });

      if (!response.ok) {
        throw new Error("Failed to update team");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      toast.success("Team updated");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", data.$id] });
    },
    onError: () => {
      toast.error("Failed to update team");
    },
  });

  return mutation;
};

