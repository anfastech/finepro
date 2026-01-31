import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

interface DeleteMemberRequest {
    param: {
        memberId: string;
    };
}

export const useDeleteMember = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        DeleteMemberRequest
    >({
        mutationFn: async ({ param }) => {
            await api.delete<any>(`/members/${param.memberId}`);

            return { data: { $id: param.memberId } };
        },
        onSuccess: () => {
            toast.success("Member deleted");
            queryClient.invalidateQueries({ queryKey: ["members"] });
        },
        onError: () => {
            toast.error("Failed to delete member");
        }
    })

    return mutation;
};
