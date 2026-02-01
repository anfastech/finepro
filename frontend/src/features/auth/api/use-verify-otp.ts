import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useVerifyOtp = () => {
    const mutation = useMutation<
        { success: boolean },
        Error,
        { email: string; userId: string; secret: string }
    >({
        mutationFn: async ({ email, userId, secret }) => {
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: secret,
                type: "signup"
            });

            if (error) {
                throw new Error(error.message);
            }

            return { success: true };
        },
        onSuccess: () => {
            toast.success("Email verified successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Invalid OTP");
        }
    });

    return mutation;
};