// Supabase workspace API

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createClient } from "@supabase/supabase-js";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/config";

// --- Remove unused imports ---
// import { startOfMonth, endOfMonth, subMonths } from "date-fns";
// import { Workspace } from "../types";
// import { TaskStatus } from "@/features/tasks/types";

// --- Implement (dummy) sessionMiddleware and user extraction ---
// In reality, move this to a separate middleware/util file
const sessionMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("authorization");
  // Dummy: Replace with your actual session/user check
  if (!authHeader) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  // Fake user for demonstration; extract from token in production
  c.set("user", { $id: authHeader.replace("Bearer ", "") });
  await next();
};
// little helper to make get("user") type safe
type Context = ReturnType<typeof app["request"]> & {
  get: <T = any>(key: string) => T;
};

// Generate a random invite code
function generateInviteCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const app = new Hono()
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createWorkspaceSchema),
    async (c: any) => {
      // image is unused, so omit
      const { name } = c.req.valid("json");
      const user = c.get("user");

      if (!user || !user.$id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        const { data, error } = await supabase
          .from('workspaces')
          .insert({
            name,
            owner_id: user.$id,
            invite_code: generateInviteCode(),
          })
          .select()
          .single();

        if (error) {
          return c.json({ error: error.message }, 400);
        }

        // Add owner as admin member
        await supabase
          .from('members')
          .insert({
            user_id: user.$id,
            workspace_id: data.id,
            role: 'admin',
          });

        return c.json({
          $id: data.id,
          name: data.name,
          inviteCode: data.invite_code,
          imageUrl: data.image_url || "",
          userId: data.owner_id,
          $createdAt: data.created_at,
        });
      } catch {
        return c.json({ error: "Failed to create workspace" }, 500);
      }
    }
  )
  .get(
    "/",
    sessionMiddleware,
    async (c: any) => {
      const user = c.get("user");
      if (!user || !user.$id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        const { data: workspaces, error } = await supabase
          .from('workspaces')
          .select(`
            *,
            members!inner(
              user_id,
              role
            )
          `)
          .or(`owner_id.eq.${user.$id},members.user_id.eq.${user.$id}`)
          .order('created_at', { ascending: false });

        if (error) {
          return c.json({ error: error.message }, 400);
        }

        return c.json({
          documents: (workspaces ?? []).map((ws: any) => ({
            $id: ws.id,
            $createdAt: ws.created_at,
            $updatedAt: ws.updated_at,
            name: ws.name,
            inviteCode: ws.invite_code || "",
            imageUrl: ws.image_url || "",
            userId: ws.owner_id,
          })),
          total: workspaces?.length ?? 0,
        });
      } catch {
        return c.json({ error: "Failed to fetch workspaces" }, 500);
      }
    }
  )
  .get(
    "/:workspaceId",
    sessionMiddleware,
    async (c: any) => {
      const workspaceId = c.req.param("workspaceId");

      try {
        const { data: workspace, error } = await supabase
          .from('workspaces')
          .select('*')
          .eq('id', workspaceId)
          .single();

        if (error || !workspace) {
          return c.json({ error: "Workspace not found" }, 404);
        }

        return c.json({
          $id: workspace.id,
          name: workspace.name,
          inviteCode: workspace.invite_code || "",
          imageUrl: workspace.image_url || "",
          userId: workspace.owner_id,
          $createdAt: workspace.created_at,
          $updatedAt: workspace.updated_at,
        });
      } catch {
        return c.json({ error: "Failed to fetch workspace" }, 500);
      }
    }
  )
  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("json", updateWorkspaceSchema),
    async (c: any) => {
      const workspaceId = c.req.param("workspaceId");
      const { name } = c.req.valid("json");
      const user = c.get("user");

      if (!user || !user.$id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        // Check if user is owner
        const { data: workspace, error: fetchError } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .single();

        if (fetchError || !workspace || workspace.owner_id !== user.$id) {
          return c.json({ error: "Not authorized" }, 403);
        }

        const { data, error } = await supabase
          .from('workspaces')
          .update({ name })
          .eq('id', workspaceId)
          .select()
          .single();

        if (error) {
          return c.json({ error: error.message }, 400);
        }

        return c.json({
          $id: data.id,
          name: data.name,
          inviteCode: data.invite_code || "",
          imageUrl: data.image_url || "",
          userId: data.owner_id,
          $createdAt: data.created_at,
          $updatedAt: data.updated_at,
        });
      } catch {
        return c.json({ error: "Failed to update workspace" }, 500);
      }
    }
  )
  .delete(
    "/:workspaceId",
    sessionMiddleware,
    async (c: any) => {
      const workspaceId = c.req.param("workspaceId");
      const user = c.get("user");

      if (!user || !user.$id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        // Check if user is owner
        const { data: workspace, error: fetchError } = await supabase
          .from('workspaces')
          .select('owner_id')
          .eq('id', workspaceId)
          .single();

        if (fetchError || !workspace || workspace.owner_id !== user.$id) {
          return c.json({ error: "Not authorized" }, 403);
        }

        const { error } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', workspaceId);

        if (error) {
          return c.json({ error: error.message }, 400);
        }

        return c.json({ success: true });
      } catch {
        return c.json({ error: "Failed to delete workspace" }, 500);
      }
    }
  )
  .post(
    "/:workspaceId/join",
    sessionMiddleware,
    async (c: any) => {
      const workspaceId = c.req.param("workspaceId");
      const { inviteCode } = await c.req.json();
      const user = c.get("user");

      if (!user || !user.$id) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      try {
        // Verify invite code
        const { data: workspace, error: fetchError } = await supabase
          .from('workspaces')
          .select('id, invite_code')
          .eq('id', workspaceId)
          .eq('invite_code', inviteCode)
          .single();

        if (fetchError || !workspace) {
          return c.json({ error: "Invalid invite code" }, 400);
        }

        // Check if already a member
        const { data: existingMember } = await supabase
          .from('members')
          .select('id')
          .eq('user_id', user.$id)
          .eq('workspace_id', workspaceId)
          .single();

        if (existingMember) {
          return c.json({ error: "Already a member" }, 400);
        }

        // Add as member
        const { error: joinError } = await supabase
          .from('members')
          .insert({
            user_id: user.$id,
            workspace_id: workspaceId,
            role: 'member',
          });

        if (joinError) {
          return c.json({ error: joinError.message }, 400);
        }

        return c.json({ success: true });
      } catch {
        return c.json({ error: "Failed to join workspace" }, 500);
      }
    }
  );

export default app;