import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().default(""),
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  projectId: z.string().trim().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().trim().min(1, "Title is required").optional(),
  content: z.string().optional(),
});

