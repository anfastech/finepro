import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useCurrent = () => {
    const query = useQuery({
        queryKey: ["current"],
        queryFn: async () => {
            const { data: { user }, error } = await supabase.auth.getUser();

            if (error) {
                throw new Error(error.message);
            }

            return user;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    return query;
};