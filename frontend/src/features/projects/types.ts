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

export type Project = Document & {
    name: string;
    imageUrl: string;
    workspaceId: string;
    teamId?: string;
}