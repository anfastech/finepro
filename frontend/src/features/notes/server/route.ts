import z from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { createSupabaseClient } from "@/lib/supabase-server";
import { createNoteSchema, updateNoteSchema } from "../schemas";
import { Note } from "../types";

const app = new Hono()
  .get(
    "/",
    zValidator("query", z.object({ workspaceId: z.string(), projectId: z.string().optional() })),
    async (c) => {
      const supabase = await createSupabaseClient();
      const { workspaceId, projectId } = c.req.valid("query");

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

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

      // Build query
      let query = supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_edited_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: notes, error: notesError } = await query;

      if (notesError) {
        return c.json({ error: notesError.message }, 500);
      }

      return c.json({ 
        data: {
          documents: notes || [],
          total: notes?.length || 0,
        }
      });
    }
  )
  .get(
    "/:noteId",
    async (c) => {
      const supabase = await createSupabaseClient();
      const { noteId } = c.req.param();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get note
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (noteError || !note) {
        return c.json({ error: "Note not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', note.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: note });
    }
  )
  .post(
    "/",
    zValidator("json", createNoteSchema),
    async (c) => {
      const supabase = await createSupabaseClient();
      const { title, content, workspaceId, projectId } = c.req.valid("json");

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

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

      // Create note
      const { data: note, error: createError } = await supabase
        .from('notes')
        .insert({
          title,
          content: content || "",
          workspace_id: workspaceId,
          project_id: projectId || null,
          last_edited_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        return c.json({ error: createError.message }, 500);
      }

      return c.json({ data: note });
    }
  )
  .patch(
    "/:noteId",
    zValidator("json", updateNoteSchema),
    async (c) => {
      const supabase = await createSupabaseClient();
      const { noteId } = c.req.param();
      const updateData = c.req.valid("json");

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get existing note
      const { data: existingNote, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (noteError || !existingNote) {
        return c.json({ error: "Note not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', existingNote.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Update note
      const { data: note, error: updateError } = await supabase
        .from('notes')
        .update({
          ...updateData,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single();

      if (updateError) {
        return c.json({ error: updateError.message }, 500);
      }

      return c.json({ data: note });
    }
  )
  .delete(
    "/:noteId",
    async (c) => {
      const supabase = await createSupabaseClient();
      const { noteId } = c.req.param();

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get note to check workspace
      const { data: note, error: noteError } = await supabase
        .from('notes')
        .select('*')
        .eq('id', noteId)
        .single();

      if (noteError || !note) {
        return c.json({ error: "Note not found" }, 404);
      }

      // Check if user is a member of this workspace
      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('workspace_id', note.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Delete note
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (deleteError) {
        return c.json({ error: deleteError.message }, 500);
      }

      return c.json({ data: { success: true } });
    }
  );

export default app;