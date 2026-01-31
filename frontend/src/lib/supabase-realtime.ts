import { createClient } from '@supabase/supabase-js'
import { RealtimeChannel } from '@supabase/supabase-js'

class SupabaseRealtimeManager {
  private supabase: ReturnType<typeof createClient>
  private channels: Map<string, RealtimeChannel> = new Map()

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  // Subscribe to workspace changes
  subscribeToWorkspace(workspaceId: string, callbacks: {
    onTaskChange?: (payload: any) => void
    onProjectChange?: (payload: any) => void
    onMemberChange?: (payload: any) => void
  }) {
    const channelName = `workspace-${workspaceId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => callbacks.onTaskChange?.(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => callbacks.onProjectChange?.(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'members',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => callbacks.onMemberChange?.(payload)
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // Subscribe to project-specific changes
  subscribeToProject(projectId: string, callbacks: {
    onTaskChange?: (payload: any) => void
    onEpicChange?: (payload: any) => void
    onProjectChange?: (payload: any) => void
  }) {
    const channelName = `project-${projectId}`
    
    if (this.channels.has(channelName)) {
      return this.channels.get(channelName)!
    }

    const channel = this.supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => callbacks.onTaskChange?.(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'epics',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => callbacks.onEpicChange?.(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`
        },
        (payload) => callbacks.onProjectChange?.(payload)
      )
      .subscribe()

    this.channels.set(channelName, channel)
    return channel
  }

  // Unsubscribe from a specific channel
  unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.channels.delete(channelName)
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll() {
    this.channels.forEach((channel) => {
      this.supabase.removeChannel(channel)
    })
    this.channels.clear()
  }

  // Get active channel count
  getActiveChannelsCount(): number {
    return this.channels.size
  }
}

// Singleton instance
let realtimeManager: SupabaseRealtimeManager | null = null

export function getRealtimeManager(supabaseUrl: string, supabaseKey: string): SupabaseRealtimeManager {
  if (!realtimeManager) {
    realtimeManager = new SupabaseRealtimeManager(supabaseUrl, supabaseKey)
  }
  return realtimeManager
}

export { SupabaseRealtimeManager }