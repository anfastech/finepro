import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useChangePassword = () => {
    const mutation = useMutation<
        { success: boolean },
        Error,
        { currentPassword: string; newPassword: string }
    >({
        mutationFn: async ({ currentPassword, newPassword }) => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error("User not authenticated");
            }

            // Verify current password by trying to sign in
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: user.email || "",
                password: currentPassword
            });

            if (verifyError) {
                throw new Error("Current password is incorrect");
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                throw new Error("Failed to update password");
            }

            return { success: true };
        },
        onSuccess: () => {
            toast.success("Password changed successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to change password");
        }
    });

    return mutation;
};