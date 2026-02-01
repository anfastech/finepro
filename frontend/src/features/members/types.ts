export enum MemberRole {
    ADMIN = "ADMIN",
    MEMBER = "MEMBER",
}

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

export type Member = Document & {
    workspace_id: string;
    user_id: string;
    role: MemberRole;
    name?: string;
    email?: string;
    avatar_color?: {
        bg: string;
        text: string;
    };
    // For backward compatibility
    workspaceId: string;
    userId: string;
    avatarColor?: {
        bg: string;
        text: string;
    };
};