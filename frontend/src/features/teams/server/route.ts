import z from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createSupabaseClient } from "@/lib/supabase-server";
import { createTeamSchema, updateTeamSchema, addTeamMembersSchema, removeTeamMembersSchema } from "../schemas";
import { Team } from "../types";

const app = new Hono()
  .post(
    "/",
    zValidator("json", createTeamSchema), // Changed from form to json
    async (c) => {
      const supabase = await createSupabaseClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { name, workspaceId, description, color } = c.req.valid("json");

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Create team
      const { data: team, error: createError } = await supabase
        .from('teams')
        .insert({
          name,
          workspace_id: workspaceId,
          description: description || null,
          color: color || '#3B82F6',
          image_url: null, // TODO: Implement image upload with Supabase Storage
        })
        .select()
        .single();

      if (createError) {
        return c.json({ error: createError.message }, 500);
      }

      return c.json({ data: team });
    }
  )
  .get(
    "/",
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const supabase = await createSupabaseClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { workspaceId } = c.req.valid("query");

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (teamsError) {
        return c.json({ error: teamsError.message }, 500);
      }

      return c.json({ 
        data: {
          documents: teams || [],
          total: teams?.length || 0,
        }
      });
    }
  )
  .get(
    "/:teamId",
    async (c) => {
      const supabase = await createSupabaseClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { teamId } = c.req.param();

      // Get team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return c.json({ error: "Team not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', team.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: team });
    }
  )
  .patch(
    "/:teamId",
    zValidator("json", updateTeamSchema),
    async (c) => {
      const supabase = await createSupabaseClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { teamId } = c.req.param();
      const { name, description, color } = c.req.valid("json");

      // Get existing team
      const { data: existingTeam, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError || !existingTeam) {
        return c.json({ error: "Team not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', existingTeam.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Update team
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (color !== undefined) updateData.color = color;

      const { data: team, error: updateError } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', teamId)
        .select()
        .single();

      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }

      return c.json({ data: team });
    }
  )
  .delete(
    "/:teamId",
    async (c) => {
      const supabase = await createSupabaseClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { teamId } = c.req.param();

      // Get team to delete
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return c.json({ error: "Team not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', team.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Delete team
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (deleteError) {
        return c.json({ error: deleteError.message }, 500);
      }

      return c.json({ data: { id: team.id } });
    }
  )
  .post(
    "/:teamId/members",
    zValidator("json", addTeamMembersSchema),
    async (c) => {
      const supabase = await createSupabaseClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { teamId } = c.req.param();
      const { memberIds } = c.req.valid("json");

      // Get team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('workspace_id')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return c.json({ error: "Team not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', team.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Add members to team
      const updatePromises = memberIds.map(memberId => 
        supabase
          .from('members')
          .update({ team_id: teamId })
          .eq('user_id', memberId)
          .eq('workspace_id', team.workspace_id)
      );

      const results = await Promise.all(updatePromises);

      // Check for any errors
      const errors = results.filter(result => result.error);
      if (errors.length > 0) {
        return c.json({ error: "Some member updates failed" }, 500);
      }

      return c.json({ data: { success: true } });
    }
  )
  .delete(
    "/:teamId/members",
    zValidator("json", removeTeamMembersSchema),
    async (c) => {
      const supabase = await createSupabaseClient();
      
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { teamId } = c.req.param();
      const { memberIds } = c.req.valid("json");

      // Get team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('workspace_id')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return c.json({ error: "Team not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', team.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Remove members from team
      const { error: updateError } = await supabase
        .from('members')
        .update({ team_id: null })
        .eq('workspace_id', team.workspace_id)
        .in('user_id', memberIds);

      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }

      return c.json({ data: { success: true } });
    }
  );

export default app;