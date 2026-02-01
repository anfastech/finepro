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

export type Project = {
  id: string;
  name: string;
  workspaceId?: string;
  workspace_id?: string;
  imageUrl?: string;
  image_url?: string;
  teamId?: string;
  created_at?: string;
  updated_at?: string;
  // Legacy support
  $id?: string;
  $createdAt?: string;
  $updatedAt?: string;
}