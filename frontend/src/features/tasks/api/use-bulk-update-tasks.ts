import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { TaskStatus } from "../types";

interface BulkUpdateTasksRequest {
  json: {
    tasks: {
      $id: string;
      status: TaskStatus;
      position: number;
    }[];
  };
}

export const useBulkUpdateTasks = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<{ data: any }, Error, BulkUpdateTasksRequest>({
    mutationFn: async ({ json }) => {
      // Map frontend data to backend schema
      const tasks = json.tasks.map(t => ({
        id: t.$id,
        status: t.status,
        position: t.position
      }));

      const response = await api.post<any>("/tasks/bulk-update", { tasks });

      // Bulk update usually returns the updated tasks list, we can wrap it
      return { data: response };
    },
    onSuccess: () => {
      toast.success("Tasks updated");

      queryClient.invalidateQueries({ queryKey: ["project-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: () => {
      toast.error("Failed to update tasks");
    },
  });

  return mutation;
};
