import { createSupabaseClient } from "@/lib/supabase-server";

// protect 
export const getCurrent = async () => {
  try {
    const supabase = await createSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      $id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url: user.user_metadata?.avatar_url,
      has_password: user.user_metadata?.has_password,
    };
  } catch {
    return null;
    // redirect('/something')
  }
};
