import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useLogin = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { user: any; session: any },
        Error,
        { email: string; password: string }
    >({
        mutationFn: async ({ email, password }) => {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            toast.success("Logged in successfully");
            router.refresh();
            queryClient.invalidateQueries({ queryKey: ["current"] });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to login");
        }
    });

    return mutation;
};

export const useOAuthLogin = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation<
        void,
        Error,
        { provider: 'google' | 'github' }
    >({
        mutationFn: async ({ provider }) => {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            toast.success("Redirecting to login...");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to login");
        }
    });

    return mutation;
};

export const useMagicLinkLogin = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation<
        void,
        Error,
        { email: string }
    >({
        mutationFn: async ({ email }) => {
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                throw new Error(error.message);
            }
        },
        onSuccess: () => {
            toast.success("Magic link sent to your email");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to send magic link");
        }
    });

    return mutation;
};