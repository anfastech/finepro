import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.auth["update-name"]["$post"]>;
type RequestType = InferRequestType<typeof rpc.api.auth["update-name"]["$post"]>;

export const useUpdateName = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({json}) => {
            const response = await rpc.api.auth["update-name"]["$post"]({json});

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to update name");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Name updated successfully");
            queryClient.invalidateQueries({ queryKey: ["current"] });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update name");
        }
    })

    return mutation;
};

