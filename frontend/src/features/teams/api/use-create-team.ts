import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.teams.$post, 200>;
type RequestType = InferRequestType<typeof rpc.api.teams.$post>;

export const useCreateTeam = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await rpc.api.teams.$post({ json });

      if (!response.ok) {
        throw new Error("Failed to create team");
      }

      return await response.json();
    },
    onSuccess: (res) => {
      toast.success("Team created");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: () => {
      toast.error("Failed to create team");
    },
  });

  return mutation;
};

