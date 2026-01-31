import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";

interface DeleteWorkspaceRequest {
    param: {
        workspaceId: string;
    }
}

export const useDeleteWorkspace = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        DeleteWorkspaceRequest
    >({
        mutationFn: async ({ param }) => {
            await api.delete<any>(`/workspaces/${param.workspaceId}`);
            return { data: { $id: param.workspaceId } };
        },
        onSuccess: ({ data }) => {
            toast.success("Workspace deleted");
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            queryClient.invalidateQueries({ queryKey: ["workspace", data.$id] });
        },
        onError: () => {
            toast.error("Failed to delete workspace");
        }
    })

    return mutation;
};
