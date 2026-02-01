import { DatabaseDocument } from "@/lib/database";

export type Team = DatabaseDocument & {
  name: string;
  workspaceId: string;
  description?: string;
  imageUrl?: string;
  memberIds: string[];
  color?: string;
};

