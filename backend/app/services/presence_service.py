# Real-time Presence System
import asyncio
import json
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum

from app.core.websocket_manager import ws_manager, WSMessage, MessageType
import logging

logger = logging.getLogger(__name__)

class PresenceStatus(str, Enum):
    """User presence status"""
    ONLINE = "online"
    IDLE = "idle"
    AWAY = "away"
    OFFLINE = "offline"
    BUSY = "busy"

@dataclass
class UserPresence:
    """User presence information"""
    user_id: str
    user_name: str
    workspace_id: str
    current_project_id: Optional[str] = None
    current_task_id: Optional[str] = None
    status: PresenceStatus = PresenceStatus.ONLINE
    last_seen: datetime = None
    last_activity: datetime = None
    is_typing: bool = False
    is_editing: bool = False
    current_page: Optional[str] = None  # Current page/view
    browser_info: Optional[Dict[str, Any]] = None
    location: Optional[str] = None
    
    def __post_init__(self):
        if self.last_seen is None:
            self.last_seen = datetime.utcnow()
        if self.last_activity is None:
            self.last_activity = datetime.utcnow()

@dataclass
class PresenceUpdate:
    """Presence update data"""
    user_id: str
    status: Optional[PresenceStatus] = None
    current_project_id: Optional[str] = None
    current_task_id: Optional[str] = None
    is_typing: Optional[bool] = None
    is_editing: Optional[bool] = None
    current_page: Optional[str] = None
    location: Optional[str] = None

class PresenceService:
    """Service for managing real-time user presence"""
    
    def __init__(self):
        self.user_presence: Dict[str, UserPresence] = {}  # user_id -> presence
        self.workspace_presence: Dict[str, Set[str]] = {}  # workspace_id -> {user_ids}
        self.project_presence: Dict[str, Set[str]] = {}  # project_id -> {user_ids}
        self.task_presence: Dict[str, Set[str]] = {}  # task_id -> {user_ids}
        
        # Activity tracking
        self.activity_thresholds = {
            "idle": timedelta(minutes=5),      # 5 minutes idle
            "away": timedelta(minutes=15),     # 15 minutes away
            "offline": timedelta(minutes=30)    # 30 minutes offline
        }
        
        # Background cleanup task
        # Background cleanup task - moved to start() method to avoid import-time loop errors
        # asyncio.create_task(self._cleanup_presence())
        # asyncio.create_task(self._broadcast_presence_updates())

    async def update_presence(
        self,
        user_id: str,
        user_name: str,
        workspace_id: str,
        update_data: PresenceUpdate,
        browser_info: Optional[Dict[str, Any]] = None
    ):
        """Update user presence information"""
        
        current_time = datetime.utcnow()
        
        # Get existing presence or create new
        if user_id in self.user_presence:
            presence = self.user_presence[user_id]
            old_status = presence.status
            old_project = presence.current_project_id
            old_task = presence.current_task_id
        else:
            presence = UserPresence(
                user_id=user_id,
                user_name=user_name,
                workspace_id=workspace_id,
                browser_info=browser_info
            )
            self.user_presence[user_id] = presence
            old_status = None
            old_project = None
            old_task = None
        
        # Update presence data
        if update_data.status:
            presence.status = update_data.status
        
        if update_data.current_project_id is not None:
            presence.current_project_id = update_data.current_project_id
        
        if update_data.current_task_id is not None:
            presence.current_task_id = update_data.current_task_id
        
        if update_data.is_typing is not None:
            presence.is_typing = update_data.is_typing
        
        if update_data.is_editing is not None:
            presence.is_editing = update_data.is_editing
        
        if update_data.current_page:
            presence.current_page = update_data.current_page
        
        if update_data.location:
            presence.location = update_data.location
        
        # Update timestamps
        presence.last_activity = current_time
        presence.last_seen = current_time
        
        # Update workspace presence
        if workspace_id not in self.workspace_presence:
            self.workspace_presence[workspace_id] = set()
        self.workspace_presence[workspace_id].add(user_id)
        
        # Update project presence if set
        if presence.current_project_id:
            if old_project and old_project != presence.current_project_id:
                # Remove from old project
                if old_project in self.project_presence:
                    self.project_presence[old_project].discard(user_id)
            
            # Add to new project
            if presence.current_project_id not in self.project_presence:
                self.project_presence[presence.current_project_id] = set()
            self.project_presence[presence.current_project_id].add(user_id)
        
        # Update task presence if set
        if presence.current_task_id:
            if old_task and old_task != presence.current_task_id:
                # Remove from old task
                if old_task in self.task_presence:
                    self.task_presence[old_task].discard(user_id)
            
            # Add to new task
            if presence.current_task_id not in self.task_presence:
                self.task_presence[presence.current_task_id] = set()
            self.task_presence[presence.current_task_id].add(user_id)
        
        # Broadcast presence changes
        await self._broadcast_presence_change(presence, {
            "status_changed": old_status != presence.status,
            "project_changed": old_project != presence.current_project_id,
            "task_changed": old_task != presence.current_task_id
        })
        
        logger.info(f"Updated presence for user {user_id}: {presence.status}")

    async def set_user_online(
        self,
        user_id: str,
        user_name: str,
        workspace_id: str,
        browser_info: Optional[Dict[str, Any]] = None
    ):
        """Mark user as online"""
        
        update_data = PresenceUpdate(status=PresenceStatus.ONLINE)
        await self.update_presence(user_id, user_name, workspace_id, update_data, browser_info)

    async def set_user_offline(self, user_id: str):
        """Mark user as offline"""
        
        if user_id in self.user_presence:
            presence = self.user_presence[user_id]
            presence.status = PresenceStatus.OFFLINE
            presence.last_seen = datetime.utcnow()
            
            # Broadcast offline status
            await self._broadcast_presence_change(presence, {"status_changed": True})
            
            logger.info(f"User {user_id} went offline")

    async def update_activity(
        self,
        user_id: str,
        activity_type: str,  # "typing", "editing", "viewing", etc.
        entity_id: Optional[str] = None,  # project_id or task_id
        data: Optional[Dict[str, Any]] = None
    ):
        """Update user activity"""
        
        if user_id not in self.user_presence:
            return
        
        presence = self.user_presence[user_id]
        presence.last_activity = datetime.utcnow()
        
        # Update status based on activity
        if presence.status == PresenceStatus.IDLE or presence.status == PresenceStatus.AWAY:
            presence.status = PresenceStatus.ONLINE
        
        # Handle specific activity types
        if activity_type == "typing":
            presence.is_typing = True
            # Reset typing after 10 seconds
            asyncio.create_task(self._reset_typing_indicator(user_id, 10))
        
        elif activity_type == "editing":
            presence.is_editing = True
            # Reset editing after 30 seconds
            asyncio.create_task(self._reset_editing_indicator(user_id, 30))
        
        elif activity_type == "viewing_task" and entity_id:
            presence.current_task_id = entity_id
        
        elif activity_type == "viewing_project" and entity_id:
            presence.current_project_id = entity_id
        
        # Broadcast activity update
        activity_message = WSMessage(
            type="user_activity_updated",
            data={
                "user_id": user_id,
                "activity_type": activity_type,
                "entity_id": entity_id,
                "data": data,
                "timestamp": datetime.utcnow().isoformat()
            },
            timestamp=datetime.utcnow(),
            room_id=presence.workspace_id,
            user_id=user_id
        )
        
        await ws_manager.broadcast_to_workspace(presence.workspace_id, activity_message, exclude_user=user_id)

    async def get_workspace_presence(self, workspace_id: str) -> List[Dict[str, Any]]:
        """Get presence information for all users in workspace"""
        
        user_ids = self.workspace_presence.get(workspace_id, set())
        presence_list = []
        
        for user_id in user_ids:
            if user_id in self.user_presence:
                presence = self.user_presence[user_id]
                presence_dict = asdict(presence)
                presence_dict["last_seen"] = presence.last_seen.isoformat()
                presence_dict["last_activity"] = presence.last_activity.isoformat()
                presence_dict["status"] = presence.status.value
                presence_list.append(presence_dict)
        
        return presence_list

    async def get_project_presence(self, project_id: str) -> List[Dict[str, Any]]:
        """Get presence information for users in a project"""
        
        user_ids = self.project_presence.get(project_id, set())
        presence_list = []
        
        for user_id in user_ids:
            if user_id in self.user_presence:
                presence = self.user_presence[user_id]
                presence_dict = asdict(presence)
                presence_dict["last_seen"] = presence.last_seen.isoformat()
                presence_dict["last_activity"] = presence.last_activity.isoformat()
                presence_dict["status"] = presence.status.value
                presence_list.append(presence_dict)
        
        return presence_list

    async def get_task_presence(self, task_id: str) -> List[Dict[str, Any]]:
        """Get presence information for users viewing a task"""
        
        user_ids = self.task_presence.get(task_id, set())
        presence_list = []
        
        for user_id in user_ids:
            if user_id in self.user_presence:
                presence = self.user_presence[user_id]
                presence_dict = asdict(presence)
                presence_dict["last_seen"] = presence.last_seen.isoformat()
                presence_dict["last_activity"] = presence.last_activity.isoformat()
                presence_dict["status"] = presence.status.value
                presence_list.append(presence_dict)
        
        return presence_list

    async def get_user_presence(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get presence information for a specific user"""
        
        if user_id not in self.user_presence:
            return None
        
        presence = self.user_presence[user_id]
        presence_dict = asdict(presence)
        presence_dict["last_seen"] = presence.last_seen.isoformat()
        presence_dict["last_activity"] = presence.last_activity.isoformat()
        presence_dict["status"] = presence.status.value
        
        return presence_dict

    async def get_workspace_stats(self, workspace_id: str) -> Dict[str, Any]:
        """Get presence statistics for a workspace"""
        
        user_ids = self.workspace_presence.get(workspace_id, set())
        
        status_counts = {
            "online": 0,
            "idle": 0,
            "away": 0,
            "offline": 0,
            "busy": 0
        }
        
        current_time = datetime.utcnow()
        active_last_5min = 0
        active_last_hour = 0
        
        for user_id in user_ids:
            if user_id in self.user_presence:
                presence = self.user_presence[user_id]
                status_counts[presence.status.value] += 1
                
                # Count active users
                if current_time - presence.last_activity <= timedelta(minutes=5):
                    active_last_5min += 1
                if current_time - presence.last_activity <= timedelta(hours=1):
                    active_last_hour += 1
        
        return {
            "workspace_id": workspace_id,
            "total_users": len(user_ids),
            "status_counts": status_counts,
            "active_last_5min": active_last_5min,
            "active_last_hour": active_last_hour,
            "online_users": status_counts["online"] + status_counts["idle"] + status_counts["busy"]
        }

    async def _broadcast_presence_change(
        self,
        presence: UserPresence,
        changes: Dict[str, bool]
    ):
        """Broadcast presence change to relevant rooms"""
        
        message_data = {
            "user_id": presence.user_id,
            "user_name": presence.user_name,
            "status": presence.status.value,
            "current_project_id": presence.current_project_id,
            "current_task_id": presence.current_task_id,
            "last_seen": presence.last_seen.isoformat(),
            "changes": changes
        }
        
        # Broadcast to workspace
        workspace_message = WSMessage(
            type="user_presence_changed",
            data=message_data,
            timestamp=datetime.utcnow(),
            room_id=presence.workspace_id,
            user_id="system"
        )
        
        await ws_manager.broadcast_to_workspace(presence.workspace_id, workspace_message, exclude_user=presence.user_id)
        
        # Broadcast to project if user is in one
        if presence.current_project_id and changes.get("project_changed"):
            project_message = WSMessage(
                type="user_presence_changed",
                data=message_data,
                timestamp=datetime.utcnow(),
                room_id=presence.current_project_id,
                user_id="system"
            )
            
            await ws_manager.broadcast_to_project(presence.current_project_id, project_message, exclude_user=presence.user_id)
        
        # Broadcast to task if user is in one
        if presence.current_task_id and changes.get("task_changed"):
            task_message = WSMessage(
                type="user_presence_changed",
                data=message_data,
                timestamp=datetime.utcnow(),
                room_id=presence.current_task_id,
                user_id="system"
            )
            
            await ws_manager.broadcast_to_task(presence.current_task_id, task_message, exclude_user=presence.user_id)

    async def _reset_typing_indicator(self, user_id: str, delay: int):
        """Reset typing indicator after delay"""
        await asyncio.sleep(delay)
        
        if user_id in self.user_presence:
            self.user_presence[user_id].is_typing = False
            
            # Broadcast typing stopped
            presence = self.user_presence[user_id]
            typing_message = WSMessage(
                type="user_typing_stopped",
                data={
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                timestamp=datetime.utcnow(),
                room_id=presence.workspace_id,
                user_id="system"
            )
            
            await ws_manager.broadcast_to_workspace(presence.workspace_id, typing_message)

    async def _reset_editing_indicator(self, user_id: str, delay: int):
        """Reset editing indicator after delay"""
        await asyncio.sleep(delay)
        
        if user_id in self.user_presence:
            self.user_presence[user_id].is_editing = False
            
            # Broadcast editing stopped
            presence = self.user_presence[user_id]
            editing_message = WSMessage(
                type="user_editing_stopped",
                data={
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                timestamp=datetime.utcnow(),
                room_id=presence.workspace_id,
                user_id="system"
            )
            
            await ws_manager.broadcast_to_workspace(presence.workspace_id, editing_message)

    async def _cleanup_presence(self):
        """Periodic cleanup of offline users"""
        while True:
            try:
                await asyncio.sleep(300)  # Every 5 minutes
                
                current_time = datetime.utcnow()
                users_to_cleanup = []
                
                for user_id, presence in self.user_presence.items():
                    time_since_activity = current_time - presence.last_activity
                    
                    if time_since_activity >= self.activity_thresholds["offline"]:
                        presence.status = PresenceStatus.OFFLINE
                    elif time_since_activity >= self.activity_thresholds["away"]:
                        presence.status = PresenceStatus.AWAY
                    elif time_since_activity >= self.activity_thresholds["idle"]:
                        presence.status = PresenceStatus.IDLE
                
                # Remove users offline for more than 24 hours
                one_day_ago = current_time - timedelta(days=1)
                
                for user_id, presence in self.user_presence.items():
                    if current_time - presence.last_seen >= timedelta(days=1):
                        users_to_cleanup.append(user_id)
                
                for user_id in users_to_cleanup:
                    await self._remove_user_presence(user_id)
                
                logger.info(f"Cleaned up presence for {len(users_to_cleanup)} offline users")
                
            except Exception as e:
                logger.error(f"Error in presence cleanup: {e}")

    async def _broadcast_presence_updates(self):
        """Periodic broadcast of presence updates"""
        while True:
            try:
                await asyncio.sleep(60)  # Every minute
                
                # Broadcast workspace stats
                for workspace_id, user_ids in self.workspace_presence.items():
                    if user_ids:
                        stats = await self.get_workspace_stats(workspace_id)
                        
                        stats_message = WSMessage(
                            type="workspace_presence_stats",
                            data=stats,
                            timestamp=datetime.utcnow(),
                            room_id=workspace_id,
                            user_id="system"
                        )
                        
                        await ws_manager.broadcast_to_workspace(workspace_id, stats_message)
                
            except Exception as e:
                logger.error(f"Error in presence broadcast: {e}")

    async def _remove_user_presence(self, user_id: str):
        """Remove user from all presence tracking"""
        
        if user_id in self.user_presence:
            presence = self.user_presence[user_id]
            
            # Remove from workspace
            if presence.workspace_id in self.workspace_presence:
                self.workspace_presence[presence.workspace_id].discard(user_id)
            
            # Remove from project
            if presence.current_project_id and presence.current_project_id in self.project_presence:
                self.project_presence[presence.current_project_id].discard(user_id)
            
            # Remove from task
            if presence.current_task_id and presence.current_task_id in self.task_presence:
                self.task_presence[presence.current_task_id].discard(user_id)
            
            # Remove main presence
            del self.user_presence[user_id]

# Global instance
presence_service = PresenceService()