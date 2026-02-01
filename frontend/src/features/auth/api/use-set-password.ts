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

            // Update password and metadata
            const { data: updateData, error: updateError } = await supabase.auth.updateUser({
                password,
                data: { has_password: true }
            });

            if (updateError) {
                console.error("Supabase update password error:", updateError);
                throw new Error(updateError.message || "Failed to update password");
            }

            // Sync with backend - Refresh session to ensure we have a valid token
            console.log("[useSetPassword] Refreshing session before backend sync...");
            let token: string | undefined;

            try {
                const { data: sessionData } = await supabase.auth.refreshSession();
                token = sessionData.session?.access_token;
            } catch (e) {
                console.error("[useSetPassword] Session refresh failed:", e);
                // Fallback to getSession
                const { data: currentSession } = await supabase.auth.getSession();
                token = currentSession.session?.access_token;
            }

            console.log("[useSetPassword] Syncing with backend. Token available:", !!token);

            if (token) {
                // Fix: Remove extra /api/v1 since NEXT_PUBLIC_API_URL might already include it
                // Or standardise on the env var NOT having it.
                // Assuming env var is http://localhost:8000, we need /api/v1
                // But the log showed /api/v1/api/v1, so let's check the env var or just fix the path.
                // If log was localhost:8000/api/v1/api/v1, then NEXT_PUBLIC_API_URL is likely localhost:8000/api/v1

                // Let's use a safe join or just remove one /api/v1 if the env var has it.
                // Safest fix based on the specific error:
                const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") || "";
                const response = await fetch(`${baseUrl}/api/v1/auth/me`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ has_password: true })
                });

                console.log(`[useSetPassword] Backend sync response: ${response.status}`);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`[useSetPassword] Failed to sync password status with backend: ${response.status} - ${errorText}`);
                    // Don't throw here, as the primary action (setting password) succeeded
                }
            } else {
                console.error("[useSetPassword] Could not get valid token to sync with backend");
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