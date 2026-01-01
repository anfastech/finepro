import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.auth["change-password"]["$post"]>;
type RequestType = InferRequestType<typeof rpc.api.auth["change-password"]["$post"]>;

export const useChangePassword = () => {
    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({json}) => {
            const response = await rpc.api.auth["change-password"]["$post"]({json});

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to change password");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Password changed successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to change password");
        }
    })

    return mutation;
};

