import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.auth["verify-otp"]["$post"]>;
type RequestType = InferRequestType<typeof rpc.api.auth["verify-otp"]["$post"]>;

export const useVerifyOtp = () => {
    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({json}) => {
            const response = await rpc.api.auth["verify-otp"]["$post"]({json});

            if (!response.ok) {
                const error = await response.json() as { error?: string };
                throw new Error(error.error || "Invalid OTP");
            }

            return await response.json();
        },
        onSuccess: () => {
            toast.success("Email verified successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Invalid OTP");
        }
    })

    return mutation;
};

