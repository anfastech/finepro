import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useLogout = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { error?: any },
        Error
    >({
        mutationFn: async () => {
            const { error } = await supabase.auth.signOut();

            if (error) {
                throw new Error(error.message);
            }

            return {};
        },
        onSuccess: () => {
            toast.success("Logged out successfully");
            router.refresh();
            queryClient.invalidateQueries();
        },
        onError: (error) => {
            toast.error(error.message || "Failed to logout");
        }
    });

    return mutation;
};
