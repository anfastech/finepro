import z from "zod";
import { Hono } from "hono";
import { ID, Query } from "node-appwrite";
import { zValidator } from "@hono/zod-validator";

import { getMember } from "@/features/members/utils";
import { DATABASE_ID, NOTES_ID } from "@/config";
import { sessionMiddleware } from "@/lib/session-middleware";
import { createNoteSchema, updateNoteSchema } from "../schemas";
import { Note } from "../types";

const app = new Hono()
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string(), projectId: z.string().optional() })),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { workspaceId, projectId } = c.req.valid("query");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const queries = [
        Query.equal("workspaceId", workspaceId),
        Query.orderDesc("lastEditedAt"),
      ];

      if (projectId) {
        queries.push(Query.equal("projectId", projectId));
      }

      const notes = await databases.listDocuments<Note>(
        DATABASE_ID,
        NOTES_ID,
        queries
      );

      return c.json({ data: notes });
    }
  )
  .get(
    "/:noteId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { noteId } = c.req.param();

      const note = await databases.getDocument<Note>(
        DATABASE_ID,
        NOTES_ID,
        noteId
      );

      const member = await getMember({
        databases,
        workspaceId: note.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      return c.json({ data: note });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createNoteSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { title, content, workspaceId, projectId } = c.req.valid("json");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const note = await databases.createDocument<Note>(
        DATABASE_ID,
        NOTES_ID,
        ID.unique(),
        {
          title,
          content: content || "",
          workspaceId,
          projectId: projectId || undefined,
          lastEditedAt: new Date().toISOString(),
        }
      );

      return c.json({ data: note });
    }
  )
  .patch(
    "/:noteId",
    sessionMiddleware,
    zValidator("json", updateNoteSchema),
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { noteId } = c.req.param();
      const updateData = c.req.valid("json");

      const existingNote = await databases.getDocument<Note>(
        DATABASE_ID,
        NOTES_ID,
        noteId
      );

      const member = await getMember({
        databases,
        workspaceId: existingNote.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const note = await databases.updateDocument<Note>(
        DATABASE_ID,
        NOTES_ID,
        noteId,
        {
          ...updateData,
          lastEditedAt: new Date().toISOString(),
        }
      );

      return c.json({ data: note });
    }
  )
  .delete(
    "/:noteId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const databases = c.get("database");
      const { noteId } = c.req.param();

      const note = await databases.getDocument<Note>(
        DATABASE_ID,
        NOTES_ID,
        noteId
      );

      const member = await getMember({
        databases,
        workspaceId: note.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await databases.deleteDocument(DATABASE_ID, NOTES_ID, noteId);

      return c.json({ data: { success: true } });
    }
  );

export default app;

