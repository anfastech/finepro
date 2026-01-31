import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Workspace } from "../types";

export const useGetWorkspaces = () => {
  const query = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      // Fetch current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Query workspaces where user is owner or member
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          members!inner(
            user_id,
            role
          )
        `)
        .or(`owner_id.eq.${user.id},members.user_id.eq.${user.id}`);

      if (error) {
        throw new Error(error.message);
      }

      // Transform to match frontend interface
      const documents = workspaces.map((ws: any) => ({
        $id: ws.id,
        $createdAt: ws.created_at,
        $updatedAt: ws.updated_at,
        $collectionId: "workspaces",
        $databaseId: "finepro",
        $permissions: [],

        name: ws.name,
        inviteCode: ws.invite_code || "",
        imageUrl: ws.image_url || "",
        userId: ws.owner_id
      }));

      return {
        documents,
        total: documents.length
      };
    },
  });

  return query;
};