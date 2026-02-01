import { DatabaseDocument } from "@/lib/database";

export type Note = DatabaseDocument & {
  title: string;
  content: string;
  workspaceId: string;
  projectId?: string;
  lastEditedAt: string;
};

