
import { z } from "zod";

export const createProjectSchema = z.object({
    name: z.string().min(1, "Project name is required"),
    image: z.union([
        z.instanceof(File),
        z.string().transform((value) => value === "" ? undefined : value),
    ])
    .optional(),
    workspaceId: z.string(),
    teamId: z.string().trim().optional(),
});

export const updateProjectSchema = z.object({
    name: z.string().min(1, "Minimum 1 character required").optional(),
    image: z.union([
        z.instanceof(File),
        z.string().transform((value) => value === "" ? undefined : value),
    ])
    .optional(),
    teamId: z.string().trim().optional(),
});