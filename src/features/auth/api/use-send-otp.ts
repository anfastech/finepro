import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.auth["send-otp"]["$post"]>;
type RequestType = InferRequestType<typeof rpc.api.auth["send-otp"]["$post"]>;

export const useSendOtp = () => {
    const mutation = useMutation<
        ResponseType,
        Error,
        RequestType
    >({
        mutationFn: async ({json}) => {
            const response = await rpc.api.auth["send-otp"]["$post"]({json});

            if (!response.ok) {
                let errorMessage = "Failed to send OTP";
                try {
                    const errorData = await response.json() as { 
                        error?: string; 
                        message?: string;
                        success?: boolean;
                    };
                    
                    // Check for validation errors from zValidator
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch {
                    // If JSON parsing fails, use status text
                    errorMessage = response.statusText || "Failed to send OTP";
                }
                throw new Error(errorMessage);
            }

            return await response.json() as { success: true; userId: string };
        },
        onSuccess: () => {
            toast.success("OTP sent to your email");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send OTP");
        }
    })

    return mutation;
};

