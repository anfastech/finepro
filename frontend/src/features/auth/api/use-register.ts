import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export const useRegister = () => {
    const router = useRouter();
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { user: any; session: any },
        Error,
        { email: string; password: string; name: string }
    >({
        mutationFn: async ({ email, password, name }) => {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                    },
                },
            });

            if (error) {
                throw new Error(error.message);
            }

            return data;
        },
        onSuccess: () => {
            toast.success("Registered successfully");
            router.refresh();
            queryClient.invalidateQueries({ queryKey: ["current"] });
        },
        onError: (error) => {
            toast.error(error.message || "Failed to register");
        }
    });

    return mutation;
};
