import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useUpdateName = () => {
    const mutation = useMutation<
        { success: boolean; data?: any },
        Error,
        { name: string }
    >({
        mutationFn: async ({ name }) => {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error("User not authenticated");
            }

            // Update user metadata with name
            const { error: updateError } = await supabase.auth.updateUser({
                data: {
                    full_name: name
                }
            });

            if (updateError) {
                throw new Error("Failed to update name");
            }

            const updatedUser = await supabase.auth.getUser();
            return { success: true, data: updatedUser };
        },
        onSuccess: () => {
            toast.success("Name updated successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update name");
        }
    });

    return mutation;
};