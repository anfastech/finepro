import { Models } from "node-appwrite";

export type Team = Models.Document & {
  name: string;
  workspaceId: string;
  description?: string;
  imageUrl?: string;
  memberIds: string[]; // Array of member/user IDs
  color?: string; // Optional team color for UI
};

