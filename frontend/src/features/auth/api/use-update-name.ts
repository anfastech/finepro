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
                throw new Error("Failed to update name in Supabase");
            }

            // Update backend
            const session = await supabase.auth.getSession();
            const token = session.data.session?.access_token;

            console.log("[useUpdateName] Syncing with backend. Token available:", !!token);

            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") || "";
            const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });

            console.log(`[useUpdateName] Backend sync response: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to update name in backend: ${response.status} - ${errorText}`);
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