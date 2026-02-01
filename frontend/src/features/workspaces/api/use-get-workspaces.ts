import { useQuery } from "@tanstack/react-query";
import { api as client } from "@/lib/api";

export const useGetWorkspaces = () => {
  const query = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const response = await client.get<any[]>("/workspaces/");

      // Transform backend response to match frontend interface
      const documents = response.map((ws) => ({
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