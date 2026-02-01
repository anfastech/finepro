# WebSocket API Endpoints for Real-time Features
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.websocket_manager import ws_manager, WSMessage, MessageType, logger as ws_logger
from app.api.deps import get_current_user_ws, get_current_user
import logging

logger = logging.getLogger(__name__)
from app.models.user import User
from app.services.project_service import ProjectService
from app.services.task_service import TaskService
from app.services.workspace_service import WorkspaceService
from app.database import AsyncSessionLocal
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

# WebSocket connection models
class WSConnectRequest(BaseModel):
    workspace_id: str = Field(..., description="Workspace to connect to")
    user_info: Optional[Dict[str, Any]] = Field(default=None, description="User information")

class WSJoinRoomRequest(BaseModel):
    room_id: str = Field(..., description="Room ID to join")
    room_type: str = Field(..., description="Type of room: 'project', 'task', or 'workspace'")

class WSMessageRequest(BaseModel):
    message: str = Field(..., description="Message content")
    room_id: Optional[str] = Field(default=None, description="Room ID (if targeting specific room)")
    message_type: Optional[str] = Field(default="message", description="Message type")

class TypingRequest(BaseModel):
    room_id: str = Field(..., description="Room ID where user is typing")
    is_typing: bool = Field(..., description="Whether user is typing")

@router.websocket("/connect/{token}")
async def websocket_connect(websocket: WebSocket, token: str):
    """Main WebSocket connection endpoint"""
    try:
        # Authenticate user from token
        user = await get_current_user_ws(token, websocket)
        if not user:
            logger.warning(f"WebSocket auth failed for token starting with {token[:10]}")
            # If not accepted yet, FastAPI returns 403 if we just return
            # or we can accept then close with code
            await websocket.accept()
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        # Accept the connection after successful authentication
        await websocket.accept()
        logger.info(f"WebSocket connection accepted for user {user.email}")
        
        # Wait for connection parameters
        try:
            data = await websocket.receive_text()
            logger.info(f"WebSocket received initial data: {data}")
            connect_data = json.loads(data)
            workspace_id = connect_data.get("workspace_id")
            user_info = connect_data.get("user_info", {})
        except (json.JSONDecodeError, KeyError, Exception) as e:
            logger.error(f"Failed to parse WebSocket initial data: {e}")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        if not workspace_id:
            logger.warning("WebSocket connected but no workspace_id provided")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        
        logger.info(f"WebSocket connecting to workspace: {workspace_id}")
        
        # Validate workspace access
        async with AsyncSessionLocal() as db:
            workspace_service = WorkspaceService(db)
            has_access = await workspace_service.is_member(str(user.id), workspace_id)
            if not has_access:
                await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
                return
        
        # Connect to WebSocket manager
        connection = await ws_manager.connect(
            websocket, 
            str(user.id), 
            workspace_id,
            user_info or {
                "name": user.name,
                "email": user.email,
                "role": user.role
            }
        )
        
        # Handle connection lifecycle
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                await handle_client_message(connection, user, data)
                
        except WebSocketDisconnect:
            await ws_manager.disconnect(str(user.id), workspace_id)
        except Exception as e:
            print(f"WebSocket error for user {user.id}: {e}")
            await ws_manager.disconnect(str(user.id), workspace_id)
            
    except Exception as e:
        print(f"WebSocket connection error: {e}")
        try:
            await websocket.close()
        except:
            pass

async def handle_client_message(connection, user: User, message_data: str):
    """Handle incoming message from WebSocket client"""
    try:
        message = json.loads(message_data)
        message_type = message.get("type", "unknown")
        
        if message_type == "join_room":
            await handle_join_room(connection, user, message)
        elif message_type == "leave_room":
            await handle_leave_room(connection, user, message)
        elif message_type == "typing":
            await handle_typing(connection, user, message)
        elif message_type == "chat_message":
            await handle_chat_message(connection, user, message)
        else:
            print(f"Unknown message type: {message_type}")
            
    except json.JSONDecodeError:
        await connection.send_message(WSMessage(
            type=MessageType.ERROR,
            data={"error": "Invalid JSON message"},
            timestamp=datetime.utcnow(),
            user_id="system"
        ))
    except Exception as e:
        print(f"Error handling client message: {e}")

async def handle_join_room(connection, user: User, message: Dict[str, Any]):
    """Handle room join request"""
    room_id = message.get("room_id")
    room_type = message.get("room_type", "project")
    
    if not room_id:
        await connection.send_message(WSMessage(
            type=MessageType.ERROR,
            data={"error": "Room ID required"},
            timestamp=datetime.utcnow(),
            user_id="system"
        ))
        return
    
    # Validate access to room
    if room_type == "project":
        async with AsyncSessionLocal() as db:
            project_service = ProjectService(db)
            has_access = await project_service.has_access(room_id, str(user.id))
            if not has_access:
                await connection.send_message(WSMessage(
                    type=MessageType.ERROR,
                    data={"error": "Access denied to project"},
                    timestamp=datetime.utcnow(),
                    user_id="system"
                ))
                return
    elif room_type == "task":
        async with AsyncSessionLocal() as db:
            task_service = TaskService(db)
            has_access = await task_service.has_access(room_id, str(user.id))
            if not has_access:
                await connection.send_message(WSMessage(
                    type=MessageType.ERROR,
                    data={"error": "Access denied to task"},
                    timestamp=datetime.utcnow(),
                    user_id="system"
                ))
                return
    
    # Join room
    await ws_manager.join_room(str(user.id), room_id, room_type)
    
    await connection.send_message(WSMessage(
        type=MessageType.USER_JOINED,
        data={
            "room_id": room_id,
            "room_type": room_type,
            "user_id": str(user.id),
            "message": f"You joined {room_type} room: {room_id}"
        },
        timestamp=datetime.utcnow(),
        room_id=room_id,
        user_id=str(user.id)
    ))

async def handle_leave_room(connection, user: User, message: Dict[str, Any]):
    """Handle room leave request"""
    room_id = message.get("room_id")
    
    if room_id:
        await ws_manager.leave_room(str(user.id), room_id)
        
        await connection.send_message(WSMessage(
            type=MessageType.USER_LEFT,
            data={
                "room_id": room_id,
                "user_id": str(user.id),
                "message": f"You left room: {room_id}"
            },
            timestamp=datetime.utcnow(),
            room_id=room_id,
            user_id=str(user.id)
        ))

async def handle_typing(connection, user: User, message: Dict[str, Any]):
    """Handle typing indicators"""
    room_id = message.get("room_id")
    is_typing = message.get("is_typing", True)
    
    if room_id:
        typing_message = WSMessage(
            type=MessageType.USER_TYPING,
            data={
                "room_id": room_id,
                "user_id": str(user.id),
                "is_typing": is_typing,
                "user_name": user.name
            },
            timestamp=datetime.utcnow(),
            room_id=room_id,
            user_id=str(user.id)
        )
        
        # Broadcast to room (excluding sender)
        if room_id.startswith("task_"):
            await ws_manager.broadcast_to_task(room_id, typing_message, exclude_user=str(user.id))
        elif room_id.startswith("project_"):
            await ws_manager.broadcast_to_project(room_id, typing_message, exclude_user=str(user.id))

async def handle_chat_message(connection, user: User, message: Dict[str, Any]):
    """Handle chat messages in rooms"""
    room_id = message.get("room_id")
    content = message.get("message")
    
    if not room_id or not content:
        await connection.send_message(WSMessage(
            type=MessageType.ERROR,
            data={"error": "Room ID and message required"},
            timestamp=datetime.utcnow(),
            user_id="system"
        ))
        return
    
    # Create chat message
    chat_message = WSMessage(
        type="chat_message",
        data={
            "room_id": room_id,
            "content": content,
            "user_id": str(user.id),
            "user_name": user.name,
            "user_email": user.email,
            "timestamp": datetime.utcnow().isoformat()
        },
        timestamp=datetime.utcnow(),
        room_id=room_id,
        user_id=str(user.id)
    )
    
    # Broadcast to room
    if room_id.startswith("task_"):
        await ws_manager.broadcast_to_task(room_id, chat_message)
    elif room_id.startswith("project_"):
        await ws_manager.broadcast_to_project(room_id, chat_message)
    else:
        await ws_manager.broadcast_to_workspace(connection.workspace_id, chat_message, exclude_user=str(user.id))

# REST endpoints for WebSocket management
@router.get("/stats/workspace/{workspace_id}")
async def get_workspace_stats(
    workspace_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get WebSocket statistics for a workspace"""
    # Check if user has access to workspace
    async with AsyncSessionLocal() as db:
        workspace_service = WorkspaceService(db)
        has_access = await workspace_service.is_member(str(current_user.id), workspace_id)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        stats = ws_manager.get_workspace_stats(workspace_id)
        return {"success": True, "data": stats}

@router.get("/stats/global")
async def get_global_stats(current_user: User = Depends(get_current_user)):
    """Get global WebSocket statistics (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    stats = ws_manager.get_global_stats()
    return {"success": True, "data": stats}

@router.post("/broadcast/global")
async def broadcast_global_message(
    message_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Broadcast message to all connected users (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    message = WSMessage(
        type=MessageType.NOTIFICATION,
        data=message_data,
        timestamp=datetime.utcnow(),
        user_id=str(current_user.id)
    )
    
    await ws_manager.broadcast_to_all(message, exclude_user=str(current_user.id))
    
    return {"success": True, "message": "Message broadcasted to all users"}

@router.post("/broadcast/workspace/{workspace_id}")
async def broadcast_workspace_message(
    workspace_id: str,
    message_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Broadcast message to all users in a workspace"""
    # Check workspace access
    async with AsyncSessionLocal() as db:
        workspace_service = WorkspaceService(db)
        has_access = await workspace_service.is_member(str(current_user.id), workspace_id)
        if not has_access:
            raise HTTPException(status_code=403, detail="Access denied")
        
        message = WSMessage(
            type=MessageType.NOTIFICATION,
            data=message_data,
            timestamp=datetime.utcnow(),
            room_id=workspace_id,
            user_id=str(current_user.id)
        )
        
        await ws_manager.broadcast_to_workspace(workspace_id, message, exclude_user=str(current_user.id))
        
        return {"success": True, "message": f"Message broadcasted to workspace {workspace_id}"}

@router.post("/notify/ai-suggestion/{user_id}")
async def send_ai_suggestion(
    user_id: str,
    suggestion_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Send AI-powered suggestion to user (system endpoint)"""
    if current_user.role not in ["admin", "super_admin", "system"]:
        raise HTTPException(status_code=403, detail="System access required")
    
    suggestion_type = suggestion_data.get("type", "general")
    suggestion = suggestion_data.get("suggestion", {})
    
    await ws_manager.notify_ai_suggestion(user_id, suggestion_type, suggestion)
    
    return {"success": True, "message": f"AI suggestion sent to user {user_id}"}

@router.get("/connections")
async def get_active_connections(
    workspace_id: Optional[str] = Query(None, description="Filter by workspace ID"),
    current_user: User = Depends(get_current_user)
):
    """Get active WebSocket connections (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    if workspace_id:
        stats = ws_manager.get_workspace_stats(workspace_id)
        connections = stats.get("connections", [])
    else:
        connections = []
        for ws_connections in ws_manager.workspace_connections.values():
            connections.extend([
                {
                    "user_id": conn.user_id,
                    "workspace_id": conn.workspace_id,
                    "connected_at": conn.connected_at.isoformat(),
                    "subscriptions": list(conn.subscriptions),
                    "user_info": conn.user_info
                }
                for conn in ws_connections.values()
            ])
    
    return {
        "success": True,
        "data": {
            "connections": connections,
            "total": len(connections)
        }
    }

@router.post("/disconnect/user/{user_id}")
async def disconnect_user(
    user_id: str,
    workspace_id: Optional[str] = Query(None, description="Workspace ID (optional)"),
    current_user: User = Depends(get_current_user)
):
    """Force disconnect a user (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find user's workspace if not provided
    if not workspace_id:
        for ws_id, connections in ws_manager.workspace_connections.items():
            if user_id in connections:
                workspace_id = ws_id
                break
    
    if not workspace_id:
        raise HTTPException(status_code=404, detail="User not found in any workspace")
    
    await ws_manager.disconnect(user_id, workspace_id)
    
    return {"success": True, "message": f"User {user_id} disconnected from workspace {workspace_id}"}