export enum TaskStatus {
    TODO = "todo",
    IN_PROGRESS = "in_progress",
    IN_REVIEW = "review",
    DONE = "done",
    BLOCKED = "blocked"
};

export type Task = {
    id: string;
    name: string;
    status: TaskStatus;
    workspaceId: string;
    assigneeId: string;
    projectId: string;
    position: number;
    dueDate: string;
    description?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    totalSubtasks?: number;
    completedSubtasks?: number;
    priority?: "critical" | "high" | "medium" | "low";
    isUrgent?: boolean;
    teamId?: string;
    created_at?: string;
    updated_at?: string;
    project?: {
        name: string;
        imageUrl?: string;
    };
    assignee?: {
        name: string;
        email?: string;
        avatarColor?: {
            bg: string;
            text: string;
        };
    };
    // Legacy support
    $id: string;
    $createdAt: string;
    $updatedAt: string;
};