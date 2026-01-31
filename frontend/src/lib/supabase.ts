import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          auth_id: string
          avatar_url: string | null
          role: 'admin' | 'manager' | 'developer' | 'designer'
          skills: Record<string, number>
          availability: Record<string, any>
          workload_percentage: number
          preferences: Record<string, any>
          whatsapp_number: string | null
          notification_settings: Record<string, any>
          last_sync: string
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at' | 'last_sync'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      workspaces: {
        Row: {
          id: string
          name: string
          invite_code: string
          owner_id: string
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['workspaces']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['workspaces']['Insert']>
      }
      members: {
        Row: {
          id: string
          user_id: string
          workspace_id: string
          role: 'admin' | 'member'
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['members']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['members']['Insert']>
      }
      projects: {
        Row: {
          id: string
          workspace_id: string
          name: string
          description: string | null
          emoji: string
          status: 'planning' | 'active' | 'paused' | 'completed'
          created_by: string
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['projects']['Insert']>
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          assignee_id: string | null
          name: string
          status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled'
          description: string | null
          priority: 'low' | 'medium' | 'high' | 'urgent'
          due_date: string | null
          project_order: number
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at' | 'updated_at' | 'project_order'>
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>
      }
      epics: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['epics']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['epics']['Insert']>
      }
    }
  }
}