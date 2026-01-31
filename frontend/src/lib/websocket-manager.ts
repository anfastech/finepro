import { io, Socket } from 'socket.io-client'
import { supabase } from './supabase'

interface PresenceData {
  userId: string
  name: string
  avatar?: string
  workspaceId: string
  projectId?: string
  taskId?: string
  status: 'online' | 'away' | 'busy'
  lastSeen: Date
}

interface TypingData {
  userId: string
  name: string
  taskId: string
  isTyping: boolean
  timestamp: Date
}

class WebSocketManager {
  private socket: Socket | null = null
  private presenceData: Map<string, PresenceData> = new Map()
  private typingData: Map<string, TypingData> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor() {
    this.connect()
  }

  private async connect() {
    try {
      // Get current user session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.warn('No user session found for WebSocket connection')
        return
      }

      // Connect to WebSocket server
      this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8001', {
        auth: {
          token: session.access_token
        }
      })

      this.setupEventHandlers()
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      this.handleReconnect()
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server')
      this.reconnectAttempts = 0
      this.sendPresenceUpdate()
    })

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server')
      this.handleReconnect()
    })

    this.socket.on('presence_update', (data: PresenceData) => {
      this.presenceData.set(data.userId, data)
    })

    this.socket.on('presence_remove', (userId: string) => {
      this.presenceData.delete(userId)
    })

    this.socket.on('typing_indicator', (data: TypingData) => {
      if (data.isTyping) {
        this.typingData.set(`${data.userId}_${data.taskId}`, data)
      } else {
        this.typingData.delete(`${data.userId}_${data.taskId}`)
      }
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
    })
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++
        this.connect()
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts))
    }
  }

  // Presence methods
  sendPresenceUpdate(status: 'online' | 'away' | 'busy' = 'online') {
    if (!this.socket?.connected) return

    this.socket.emit('update_presence', {
      status,
      timestamp: new Date()
    })
  }

  updateWorkspace(workspaceId: string) {
    if (!this.socket?.connected) return

    this.socket.emit('update_workspace', { workspaceId })
  }

  updateProject(projectId?: string) {
    if (!this.socket?.connected) return

    this.socket.emit('update_project', { projectId })
  }

  updateTask(taskId?: string) {
    if (!this.socket?.connected) return

    this.socket.emit('update_task', { taskId })
  }

  // Typing methods
  sendTypingIndicator(taskId: string, isTyping: boolean) {
    if (!this.socket?.connected) return

    this.socket.emit('typing_indicator', {
      taskId,
      isTyping,
      timestamp: new Date()
    })
  }

  // Getters
  getPresenceForWorkspace(workspaceId: string): PresenceData[] {
    return Array.from(this.presenceData.values()).filter(
      user => user.workspaceId === workspaceId
    )
  }

  getPresenceForProject(projectId: string): PresenceData[] {
    return Array.from(this.presenceData.values()).filter(
      user => user.projectId === projectId
    )
  }

  getTypingForTask(taskId: string): TypingData[] {
    return Array.from(this.typingData.values()).filter(
      typing => typing.taskId === taskId
    )
  }

  isConnected(): boolean {
    return this.socket?.connected || false
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.presenceData.clear()
    this.typingData.clear()
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager()
  }
  return wsManager
}

export { WebSocketManager }