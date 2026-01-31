import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface DeleteTaskRequest {
  param: {
    taskId: string;
  };
}

export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    any,
    Error,
    DeleteTaskRequest
  >({
    mutationFn: async ({ param }) => {
      const { taskId } = param;
      await api.delete(`/tasks/${taskId}`);

      // Return mock data for cache invalidation compatibility
      return { data: { $id: taskId } };
    },
    onSuccess: ({ data }) => {
      toast.success("Task deleted");

      queryClient.invalidateQueries({ queryKey: ["project-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task", data.$id] });
    },
    onError: () => {
      toast.error("Failed to delete task");
    }
  })

  return mutation;
};
