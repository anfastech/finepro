import { z } from "zod";

export const createWorkspaceSchema = z.object({
    name: z.string().min(1, "Workspace name is required"),
    image: z.union([
        z.instanceof(File),
        z.string().transform((value) => value === "" ? undefined : value),
    ])
    .optional(),
});

export const updateWorkspaceSchema = z.object({
    name: z.string().min(1, "Must be at least 1 character").optional(),
    image: z.union([
        z.instanceof(File),
        z.string().transform((value) => value === "" ? undefined : value),
    ])
    .optional(),
});