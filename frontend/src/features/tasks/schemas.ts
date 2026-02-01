
import { z } from "zod";

import { TaskStatus } from "./types";

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createTaskSchema = z.object({
    name: z.string().trim().min(1, "Required"),
    status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
    workspaceId: z.string().trim().min(1, "Required"),
    projectId: z.string().trim().min(1, "Required"),
    dueDate: z.coerce.date(),
    assigneeId: z.string().trim().min(1, "Required"),
    description: z.string().optional(),
    startTime: z.string().regex(timeRegex, "Time must be in HH:mm format").optional(),
    endTime: z.string().regex(timeRegex, "Time must be in HH:mm format").optional(),
    duration: z.number().positive("Duration must be positive").optional(),
    totalSubtasks: z.number().int().nonnegative("Total subtasks must be non-negative").optional(),
    completedSubtasks: z.number().int().nonnegative("Completed subtasks must be non-negative").optional(),
    priority: z.enum(["critical", "high", "medium", "low"]).optional(),
    isUrgent: z.boolean().optional(),
    teamId: z.string().trim().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();