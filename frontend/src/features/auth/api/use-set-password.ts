import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useSetPassword = () => {
    const mutation = useMutation<
        { success: boolean },
        Error,
        { password: string }
    >({
        mutationFn: async ({ password }) => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error("User not authenticated");
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password
            });

            if (updateError) {
                throw new Error("Failed to update password");
            }

            return { success: true };
        },
        onSuccess: () => {
            toast.success("Password set successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to set password");
        }
    });

    return mutation;
};