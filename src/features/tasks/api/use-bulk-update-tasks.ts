import { toast } from "sonner";
import { InferRequestType, InferResponseType } from "hono";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { rpc } from "@/lib/rpc";

type ResponseType = InferResponseType<
  (typeof rpc.api.tasks)["bulk-update"]["$post"],
  200
>;
type RequestType = InferRequestType<
  (typeof rpc.api.tasks)["bulk-update"]["$post"]
>;

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await rpc.api.tasks["bulk-update"]["$post"]({ json });

      if (!response.ok) {
        throw new Error("Failed to update tasks");
      }

      return await response.json();
    },
    onSuccess: (res) => {
      if ("data" in res) {
        toast.success("Tasks updated");
        
        queryClient.invalidateQueries({ queryKey: ["project-analytics"] });
        queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });

        res.data.forEach((task: { $id: string }) => {
          queryClient.setQueryData(["tasks", task.$id], task);
        });
      } else {
        toast.error(res.error ?? "Failed to update tasks");
      }
    },
    onError: () => {
      toast.error("Failed to update tasks");
    },
  });

  return mutation;
};
