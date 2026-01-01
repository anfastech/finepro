import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { rpc } from "@/lib/rpc";
import { toast } from "sonner";

type ResponseType = InferResponseType<typeof rpc.api.notes.$post, 200>;
type RequestType = InferRequestType<typeof rpc.api.notes.$post>;

export const useCreateNote = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<ResponseType, Error, RequestType>({
    mutationFn: async ({ json }) => {
      const response = await rpc.api.notes.$post({ json });

      if (!response.ok) {
        let errorMessage = "Failed to create note";
        try {
          const errorData = await response.json() as { 
            error?: string; 
            message?: string;
          };
          
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || "Failed to create note";
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    },
    onSuccess: (res, variables) => {
      toast.success("Note created");
      queryClient.invalidateQueries({ queryKey: ["notes", variables.json.workspaceId] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create note");
    },
  });

  return mutation;
};

