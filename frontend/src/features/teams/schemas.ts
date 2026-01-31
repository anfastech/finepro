import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required"),
  workspaceId: z.string().trim().min(1, "Workspace ID is required"),
  description: z.string().trim().optional(),
  image: z
    .union([
      z.instanceof(File),
      z.string().transform((value) => (value === "" ? undefined : value)),
    ])
    .optional(),
  color: z.string().trim().optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().trim().min(1, "Team name is required").optional(),
  description: z.string().trim().optional(),
  image: z
    .union([
      z.instanceof(File),
      z.string().transform((value) => (value === "" ? undefined : value)),
    ])
    .optional(),
  color: z.string().trim().optional(),
});

export const addTeamMembersSchema = z.object({
  memberIds: z.array(z.string().trim().min(1)).min(1, "At least one member ID is required"),
});

export const removeTeamMembersSchema = z.object({
  memberIds: z.array(z.string().trim().min(1)).min(1, "At least one member ID is required"),
});

