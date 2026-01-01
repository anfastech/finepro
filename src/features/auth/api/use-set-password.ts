import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.auth["set-password"]["$post"]>;
type RequestType = InferRequestType<typeof rpc.api.auth["set-password"]["$post"]>;

export const useSetPassword = () => {
    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({json}) => {
            const response = await rpc.api.auth["set-password"]["$post"]({json});

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Failed to set password");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Password set successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to set password");
        }
    })

    return mutation;
};

