import { createSessionClient } from "@/lib/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/config";

interface GetMemberProps {
  workspaceId: string;
  userId: string;
}

export const getMember = async ({
  workspaceId,
  userId,
}: GetMemberProps) => {
  // This will be updated when we fully migrate to Supabase
  // For now, returning null to indicate migration is in progress
  console.warn("getMember needs migration to Supabase");
  return null;
};

export const createSupabaseClient = () => {
  return createSessionClient();
};
