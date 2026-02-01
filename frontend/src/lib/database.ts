// Common database document interface (replaces Supabase Models.Document)
export interface DatabaseDocument {
    $id: string;
    $createdAt: string;
    $updatedAt: string;
}

// Helper type for Supabase responses that match our interface
export type SupabaseDocument<T extends Record<string, unknown> = Record<string, unknown>> = {
    id: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
} & T;
