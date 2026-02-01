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

export type Member = {
    id: string;
    workspace_id: string;
    user_id: string;
    role: MemberRole;
    name?: string;
    email?: string;
    avatar_color?: {
        bg: string;
        text: string;
    };
    created_at?: string;
    updated_at?: string;
    // Legacy support
    $id?: string;
    $createdAt?: string;
    $updatedAt?: string;
    workspaceId?: string;
    userId?: string;
    avatarColor?: {
        bg: string;
        text: string;
    };
};