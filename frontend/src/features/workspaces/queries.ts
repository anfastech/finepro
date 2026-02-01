// Server-side queries using Supabase
import { createSupabaseClient } from "@/lib/supabase-server";
import { Workspace } from "./types";

// Get all workspaces for current user
export const getWorkspaces = async () => {
  const supabase = await createSupabaseClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Get workspaces where user is owner or member
  // Using a simpler approach: get all workspaces where user is in members list
  // (Since every owner should also be a member by design)
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select(`
        *,
        members!inner(
          user_id,
          role
        )
      `)
    .eq('members.user_id', user.id)
    .order('created_at', { ascending: false });

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
};

interface GetWorkspaceInfoProps {
  workspaceId: string;
}

export const getWorkspaceInfo = async ({ workspaceId }: GetWorkspaceInfoProps) => {
  const supabase = await createSupabaseClient();

  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    name: workspace.name,
  };
};
