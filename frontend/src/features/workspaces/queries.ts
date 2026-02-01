// Server-side queries using Supabase
import { createSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase-server";
import { Workspace } from "./types";

// Get all workspaces for current user
export const getWorkspaces = async () => {
  const supabase = await createSupabaseClient();

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("User not authenticated");
  }

  // Use Admin Client to bypass RLS policies that might fail due to ID mismatch (UUID vs String)
  const adminClient = await createSupabaseAdminClient();

  console.log("[getWorkspaces] Supabase User ID:", user.id);

  // 1. Get internal user ID from Supabase ID
  const { data: dbUser, error: dbUserError } = await adminClient
    .from('users')
    .select('id')
    .eq('supabase_id', user.id)
    .single();

  if (dbUserError || !dbUser) {
    console.error("[getWorkspaces] Failed to find internal user:", dbUserError);
    // User might not be synced yet, return empty
    return { documents: [], total: 0 };
  }

  console.log("[getWorkspaces] Internal User ID:", dbUser.id);

  // 2. Get workspaces using internal user ID
  const { data: workspaces, error } = await adminClient
    .from('workspaces')
    .select(`
        *,
        members!inner(
          user_id,
          role
        )
      `)
    .eq('members.user_id', dbUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("[getWorkspaces] Error fetching workspaces:", error);
    throw new Error(error.message);
  }

  console.log("[getWorkspaces] Found workspaces:", workspaces?.length);

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
