import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { rpc } from "@/lib/rpc";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.auth.register["$post"]>;
type RequestType = InferRequestType<typeof rpc.api.auth.register["$post"]>;


export const useRegister = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({json}) => {
            const response = await rpc.api.auth.register["$post"]({json});

            if (!response.ok) {
                const error = await response.json() as { error?: string };
                throw new Error(error.error || "Failed to register");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Registered successfully");
            router.refresh();
            queryClient.invalidateQueries({ queryKey: ["current"] });
        },
        onError: () => {
            toast.error("Failed to register");
        }
    })

    return mutation;
};
