// Legacy Document interface for backward compatibility
interface Document {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $collectionId: string;
  $databaseId: string;
  $permissions: any[];
  $sequence?: string;
}

export enum TaskStatus {
    BACKLOG = "BACKLOG",
    TODO = "TODO",
    IN_PROGRESS = "IN_PROGRESS",
    IN_REVIEW = "IN_REVIEW",
    DONE = "DONE" 
};

export type Task = Document & {
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
    priority?: "ASAP" | "HIGH" | "MEDIUM" | "LOW";
    isUrgent?: boolean;
    teamId?: string;
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
};