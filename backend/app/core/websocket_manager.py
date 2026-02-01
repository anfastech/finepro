# WebSocket Manager for Real-time Features
import json
import asyncio
import logging
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
from enum import Enum
import uuid
from dataclasses import dataclass, asdict

from fastapi import WebSocket, WebSocketDisconnect, HTTPException, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class MessageType(str, Enum):
    """Message types for WebSocket communication"""
    # Task/Project updates
    TASK_UPDATED = "task_updated"
    TASK_CREATED = "task_created"
    TASK_DELETED = "task_deleted"
    TASK_ASSIGNED = "task_assigned"
    
    # Project updates
    PROJECT_UPDATED = "project_updated"
    PROJECT_CREATED = "project_created"
    SPRINT_UPDATED = "sprint_updated"
    
    # User presence
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    USER_TYPING = "user_typing"
    
    # Real-time collaboration
    COMMENT_ADDED = "comment_added"
    MENTION = "mention"
    
    # System notifications
    NOTIFICATION = "notification"
    ERROR = "error"
    
    # AI features
    AI_SUGGESTION = "ai_suggestion"
    AI_ANALYSIS = "ai_analysis"

@dataclass
class WSMessage:
    """WebSocket message structure"""
    type: MessageType
    data: Dict[str, Any]
    timestamp: datetime
    room_id: Optional[str] = None
    user_id: Optional[str] = None
    message_id: str = None
    
    def __post_init__(self):
        if self.message_id is None:
            self.message_id = str(uuid.uuid4())
        if isinstance(self.timestamp, datetime):
            self.timestamp = self.timestamp.isoformat()

class WSConnection:
    """Represents a WebSocket connection"""
    def __init__(self, websocket: WebSocket, user_id: str, workspace_id: str):
        self.websocket = websocket
        self.user_id = user_id
        self.workspace_id = workspace_id
        self.connected_at = datetime.utcnow()
        self.last_ping = datetime.utcnow()
        self.subscriptions: Set[str] = set()  # room IDs
        self.user_info: Dict[str, Any] = {}
        
    async def send_message(self, message: WSMessage):
        """Send message to this connection"""
        try:
            message_data = {
                "id": message.message_id,
                "type": message.type.value,
                "data": message.data,
                "timestamp": message.timestamp,
                "room_id": message.room_id,
                "user_id": message.user_id
            }
            await self.websocket.send_text(json.dumps(message_data))
        except Exception as e:
            logger.error(f"Failed to send message to user {self.user_id}: {e}")
            raise

class WebSocketManager:
    """Manages WebSocket connections and message broadcasting"""
    
    def __init__(self):
        # Active connections: workspace_id -> {user_id: WSConnection}
        self.workspace_connections: Dict[str, Dict[str, WSConnection]] = {}
        
        # Project rooms: project_id -> {user_ids}
        self.project_rooms: Dict[str, Set[str]] = {}
        
        # Task rooms: task_id -> {user_ids}
        self.task_rooms: Dict[str, Set[str]] = {}
        
        # Global connections for system-wide notifications
        self.system_connections: Dict[str, WSConnection] = {}
        
        # Lock for thread safety
        self._lock = asyncio.Lock()
        
        # Connection statistics
        self.stats = {
            "total_connections": 0,
            "connections_per_workspace": {},
            "messages_sent": 0,
            "messages_received": 0,
            "connection_history": []
        }

    async def connect(self, websocket: WebSocket, user_id: str, workspace_id: str, user_info: Dict[str, Any] = None) -> WSConnection:
        """Connect a new WebSocket client"""
        # Connection already accepted in the endpoint
        # await websocket.accept()
        
        async with self._lock:
            # Create connection
            connection = WSConnection(websocket, user_id, workspace_id)
            if user_info:
                connection.user_info = user_info
            
            # Store connection
            if workspace_id not in self.workspace_connections:
                self.workspace_connections[workspace_id] = {}
            
            # Disconnect existing connection for this user if any
            if user_id in self.workspace_connections[workspace_id]:
                old_connection = self.workspace_connections[workspace_id][user_id]
                try:
                    await old_connection.websocket.close()
                except:
                    pass
            
            self.workspace_connections[workspace_id][user_id] = connection
            self.system_connections[user_id] = connection
            
            # Update stats
            self.stats["total_connections"] += 1
            if workspace_id not in self.stats["connections_per_workspace"]:
                self.stats["connections_per_workspace"][workspace_id] = 0
            self.stats["connections_per_workspace"][workspace_id] += 1
            self.stats["connection_history"].append({
                "user_id": user_id,
                "workspace_id": workspace_id,
                "connected_at": datetime.utcnow().isoformat(),
                "action": "connect"
            })
            
            # Auto-subscribe to workspace room
            await self.join_room(user_id, workspace_id, "workspace")
            
            logger.info(f"User {user_id} connected to workspace {workspace_id}")
            
            # Notify workspace about new user
            await self.broadcast_to_workspace(workspace_id, WSMessage(
                type=MessageType.USER_JOINED,
                data={
                    "user_id": user_id,
                    "user_info": user_info or {},
                    "workspace_id": workspace_id
                },
                timestamp=datetime.utcnow(),
                room_id=workspace_id,
                user_id="system"
            ))
            
            return connection

    async def disconnect(self, user_id: str, workspace_id: str):
        """Disconnect a WebSocket client"""
        async with self._lock:
            if workspace_id in self.workspace_connections and user_id in self.workspace_connections[workspace_id]:
                connection = self.workspace_connections[workspace_id][user_id]
                
                # Remove from all rooms
                for room_id in connection.subscriptions.copy():
                    await self.leave_room(user_id, room_id)
                
                # Remove from connections
                del self.workspace_connections[workspace_id][user_id]
                if user_id in self.system_connections:
                    del self.system_connections[user_id]
                
                # Update stats
                self.stats["total_connections"] -= 1
                if workspace_id in self.stats["connections_per_workspace"]:
                    self.stats["connections_per_workspace"][workspace_id] -= 1
                
                self.stats["connection_history"].append({
                    "user_id": user_id,
                    "workspace_id": workspace_id,
                    "disconnected_at": datetime.utcnow().isoformat(),
                    "action": "disconnect"
                })
                
                logger.info(f"User {user_id} disconnected from workspace {workspace_id}")
                
                # Notify workspace about user leaving
                await self.broadcast_to_workspace(workspace_id, WSMessage(
                    type=MessageType.USER_LEFT,
                    data={
                        "user_id": user_id,
                        "workspace_id": workspace_id
                    },
                    timestamp=datetime.utcnow(),
                    room_id=workspace_id,
                    user_id="system"
                ))

    async def join_room(self, user_id: str, room_id: str, room_type: str):
        """Join a user to a room"""
        async with self._lock:
            # Find user's connection
            connection = None
            for workspace_connections in self.workspace_connections.values():
                if user_id in workspace_connections:
                    connection = workspace_connections[user_id]
                    break
            
            if not connection:
                return
            
            # Add to room subscription
            connection.subscriptions.add(room_id)
            
            # Add to room-specific tracking
            if room_type == "project":
                if room_id not in self.project_rooms:
                    self.project_rooms[room_id] = set()
                self.project_rooms[room_id].add(user_id)
            elif room_type == "task":
                if room_id not in self.task_rooms:
                    self.task_rooms[room_id] = set()
                self.task_rooms[room_id].add(user_id)

    async def leave_room(self, user_id: str, room_id: str):
        """Remove a user from a room"""
        async with self._lock:
            # Find user's connection
            connection = None
            for workspace_connections in self.workspace_connections.values():
                if user_id in workspace_connections:
                    connection = workspace_connections[user_id]
                    break
            
            if connection and room_id in connection.subscriptions:
                connection.subscriptions.remove(room_id)
            
            # Remove from room-specific tracking
            if room_id in self.project_rooms:
                self.project_rooms[room_id].discard(user_id)
            if room_id in self.task_rooms:
                self.task_rooms[room_id].discard(user_id)

    async def send_personal_message(self, user_id: str, message: WSMessage):
        """Send message to specific user"""
        connection = self.system_connections.get(user_id)
        if connection:
            try:
                await connection.send_message(message)
                self.stats["messages_sent"] += 1
            except Exception as e:
                logger.error(f"Failed to send personal message to {user_id}: {e}")
                # Remove broken connection
                await self.disconnect(user_id, connection.workspace_id)

    async def broadcast_to_workspace(self, workspace_id: str, message: WSMessage, exclude_user: str = None):
        """Broadcast message to all users in a workspace"""
        if workspace_id not in self.workspace_connections:
            return
        
        for user_id, connection in self.workspace_connections[workspace_id].items():
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await connection.send_message(message)
                self.stats["messages_sent"] += 1
            except Exception as e:
                logger.error(f"Failed to broadcast to {user_id}: {e}")
                # Remove broken connection
                await self.disconnect(user_id, workspace_id)

    async def broadcast_to_project(self, project_id: str, message: WSMessage, exclude_user: str = None):
        """Broadcast message to all users subscribed to a project"""
        if project_id not in self.project_rooms:
            return
        
        for user_id in self.project_rooms[project_id].copy():
            if exclude_user and user_id == exclude_user:
                continue
            
            await self.send_personal_message(user_id, message)

    async def broadcast_to_task(self, task_id: str, message: WSMessage, exclude_user: str = None):
        """Broadcast message to all users subscribed to a task"""
        if task_id not in self.task_rooms:
            return
        
        for user_id in self.task_rooms[task_id].copy():
            if exclude_user and user_id == exclude_user:
                continue
            
            await self.send_personal_message(user_id, message)

    async def broadcast_to_all(self, message: WSMessage, exclude_user: str = None):
        """Broadcast message to all connected users"""
        for user_id, connection in list(self.system_connections.items()):
            if exclude_user and user_id == exclude_user:
                continue
            
            try:
                await connection.send_message(message)
                self.stats["messages_sent"] += 1
            except Exception as e:
                logger.error(f"Failed to broadcast to {user_id}: {e}")
                # Remove broken connection
                await self.disconnect(user_id, connection.workspace_id)

    async def notify_task_updated(self, task_id: str, task_data: Dict[str, Any], updated_by: str, project_id: str):
        """Notify about task updates"""
        message = WSMessage(
            type=MessageType.TASK_UPDATED,
            data={
                "task_id": task_id,
                "task": task_data,
                "updated_by": updated_by,
                "project_id": project_id
            },
            timestamp=datetime.utcnow(),
            room_id=project_id,
            user_id=updated_by
        )
        
        # Broadcast to project members
        await self.broadcast_to_project(project_id, message, exclude_user=updated_by)
        
        # Broadcast to task-specific subscribers
        await self.broadcast_to_task(task_id, message, exclude_user=updated_by)

    async def notify_task_assigned(self, task_id: str, task_data: Dict[str, Any], assigned_to: str, assigned_by: str, project_id: str):
        """Notify about task assignment"""
        message = WSMessage(
            type=MessageType.TASK_ASSIGNED,
            data={
                "task_id": task_id,
                "task": task_data,
                "assigned_to": assigned_to,
                "assigned_by": assigned_by,
                "project_id": project_id
            },
            timestamp=datetime.utcnow(),
            room_id=project_id,
            user_id=assigned_by
        )
        
        # Send to assigned user directly
        await self.send_personal_message(assigned_to, message)
        
        # Broadcast to project
        await self.broadcast_to_project(project_id, message, exclude_user=assigned_to)

    async def notify_comment_added(self, task_id: str, comment_data: Dict[str, Any], mentioned_users: List[str], project_id: str):
        """Notify about new comments and mentions"""
        message = WSMessage(
            type=MessageType.COMMENT_ADDED,
            data={
                "task_id": task_id,
                "comment": comment_data,
                "project_id": project_id
            },
            timestamp=datetime.utcnow(),
            room_id=task_id,
            user_id=comment_data.get("user_id")
        )
        
        # Broadcast to task subscribers
        await self.broadcast_to_task(task_id, message, exclude_user=comment_data.get("user_id"))
        
        # Send special mention notifications
        if mentioned_users:
            mention_message = WSMessage(
                type=MessageType.MENTION,
                data={
                    "task_id": task_id,
                    "comment": comment_data,
                    "project_id": project_id
                },
                timestamp=datetime.utcnow(),
                room_id=task_id,
                user_id=comment_data.get("user_id")
            )
            
            for user_id in mentioned_users:
                await self.send_personal_message(user_id, mention_message)

    async def notify_ai_suggestion(self, user_id: str, suggestion_type: str, suggestion_data: Dict[str, Any]):
        """Send AI-powered suggestions"""
        message = WSMessage(
            type=MessageType.AI_SUGGESTION,
            data={
                "type": suggestion_type,
                "suggestion": suggestion_data
            },
            timestamp=datetime.utcnow(),
            user_id="ai"
        )
        
        await self.send_personal_message(user_id, message)

    def get_workspace_stats(self, workspace_id: str) -> Dict[str, Any]:
        """Get statistics for a specific workspace"""
        connections = self.workspace_connections.get(workspace_id, {})
        
        return {
            "connected_users": len(connections),
            "user_ids": list(connections.keys()),
            "project_rooms": len([rid for rid in self.project_rooms.keys() if any(uid in connections for uid in self.project_rooms[rid])]),
            "task_rooms": len([tid for tid in self.task_rooms.keys() if any(uid in connections for uid in self.task_rooms[tid])]),
            "connections": [
                {
                    "user_id": conn.user_id,
                    "connected_at": conn.connected_at.isoformat(),
                    "subscriptions": list(conn.subscriptions),
                    "user_info": conn.user_info
                }
                for conn in connections.values()
            ]
        }

    def get_global_stats(self) -> Dict[str, Any]:
        """Get global WebSocket statistics"""
        return {
            **self.stats,
            "total_workspaces": len(self.workspace_connections),
            "total_project_rooms": len(self.project_rooms),
            "total_task_rooms": len(self.task_rooms),
            "active_connections_10min": sum(
                1 for connections in self.workspace_connections.values()
                for conn in connections.values()
                if (datetime.utcnow() - conn.last_ping).seconds < 600
            )
        }

# Global WebSocket manager instance
ws_manager = WebSocketManager()