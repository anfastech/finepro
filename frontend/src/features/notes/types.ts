import { Models } from "node-appwrite";

export type Note = Models.Document & {
  title: string;
  content: string;
  workspaceId: string;
  projectId?: string;
  lastEditedAt: string;
};

