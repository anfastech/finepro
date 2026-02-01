import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useSendOtp = () => {
    const mutation = useMutation<
        { success: boolean; userId?: string },
        Error,
        { email: string }
    >({
        mutationFn: async ({ email }) => {
            const { data, error } = await supabase.auth.resetPasswordForEmail(email);

            if (error) {
                throw new Error(error.message);
            }

            return { success: true };
        },
        onSuccess: () => {
            toast.success("Password reset link sent to your email");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send password reset link");
        }
    });

    return mutation;
};