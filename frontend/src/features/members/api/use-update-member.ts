import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { MemberRole } from "../types";

interface UpdateMemberRequest {
    param: {
        memberId: string;
    };
    json: {
        role: MemberRole;
    };
}

export const useUpdateMember = () => {
    const queryClient = useQueryClient();

    const mutation = useMutation<
        { data: any },
        Error,
        UpdateMemberRequest
    >({
        mutationFn: async ({ param, json }) => {
            const response = await api.patch<any>(`/members/${param.memberId}`, {
                role: json.role
            });

            // Adapt backend response to frontend format
            const data = {
                ...response,
                $id: response.id,
                $createdAt: response.joined_at,
                $updatedAt: response.joined_at,
            };

            return { data };
        },
        onSuccess: () => {
            toast.success("Member Updated");
            queryClient.invalidateQueries({ queryKey: ["members"] });
        },
        onError: () => {
            toast.error("Failed to update member");
        }
    })

    return mutation;
};
