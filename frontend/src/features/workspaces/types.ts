import { DatabaseDocument } from "@/lib/database";

export type Workspace = DatabaseDocument & {
    name: string;
    imageUrl: string;
    inviteCode: string;
    userId: string;
}