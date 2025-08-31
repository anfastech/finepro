import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { toast } from "sonner";

import { rpc } from "@/lib/rpc";

type ResponseType = InferResponseType<typeof rpc.api.tasks["$post"], 200>;
type RequestType = InferRequestType<typeof rpc.api.tasks["$post"]>;


export const useCreateTask = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({ json }) => {
            const response = await rpc.api.tasks["$post"]({ json });

            if (!response.ok) {
                throw new Error("Failed to create task");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Task created");
            
            queryClient.invalidateQueries({ queryKey: ["project-analytics"] });
            queryClient.invalidateQueries({ queryKey: ["workspace-analytics"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
        onError: () => {
            toast.error("Failed to create task");
        }
    })

    return mutation;
};
