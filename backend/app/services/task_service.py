"""
Task Service - Business logic for task operations
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.models.task import Task
from app.models.epic import Epic
from app.models.project import Project
from app.models.member import Member
from app.models.enums import TaskStatus, Priority, TaskType, ActionType, EntityType
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.activity_service import ActivityService


class TaskService:
    """Service for task CRUD operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.activity_service = ActivityService(db)
    
    async def get_by_id(self, task_id: UUID) -> Optional[Task]:
        """Get task by ID with relationships"""
        result = await self.db.execute(
            select(Task)
            .options(
                selectinload(Task.epic),
                selectinload(Task.assigned_user),
                selectinload(Task.comments)
            )
            .where(Task.id == task_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_project(
        self,
        project_id: UUID,
        status: Optional[TaskStatus] = None,
        priority: Optional[Priority] = None,
        assigned_to: Optional[UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Task]:
        """Get all tasks in a project with filtering"""
        # First get all epics in the project
        epic_query = select(Epic.id).where(Epic.project_id == project_id)
        epic_result = await self.db.execute(epic_query)
        epic_ids = [row[0] for row in epic_result.fetchall()]
        
        if not epic_ids:
            return []
        
        # Build task query with filters
        query = select(Task).where(Task.epic_id.in_(epic_ids))
        
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if assigned_to:
            query = query.where(Task.assigned_to == assigned_to)
        if search:
            query = query.where(
                or_(
                    Task.title.ilike(f"%{search}%"),
                    Task.description.ilike(f"%{search}%")
                )
            )
        
        query = query.order_by(Task.position.asc().nullslast(), Task.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_by_epic(self, epic_id: UUID) -> List[Task]:
        """Get all tasks in an epic"""
        result = await self.db.execute(
            select(Task)
            .where(Task.epic_id == epic_id)
            .order_by(Task.position.asc().nullslast(), Task.created_at.desc())
        )
        return list(result.scalars().all())
    
    async def create(
        self,
        project_id: UUID,
        data: TaskCreate,
        user_id: UUID
    ) -> Task:
        """Create a new task"""
        # If no epic_id provided, get or create default epic for project
        epic_id = data.epic_id
        if not epic_id:
            # Get default epic or first epic in project
            result = await self.db.execute(
                select(Epic).where(Epic.project_id == project_id).limit(1)
            )
            epic = result.scalar_one_or_none()
            if epic:
                epic_id = epic.id
        
        # Get next position
        position = await self._get_next_position(epic_id)
        
        task = Task(
            epic_id=epic_id,
            title=data.title,
            description=data.description,
            task_type=data.task_type,
            status=data.status,
            priority=data.priority,
            assigned_to=data.assigned_to,
            created_by=user_id,
            estimated_hours=data.estimated_hours,
            due_date=data.due_date,
            dependencies=data.dependencies or [],
            tags=data.tags or [],
            ai_confidence=data.ai_confidence,
            additional_data=data.additional_data or {},
            position=position
        )
        
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.CREATED,
            entity_type=EntityType.TASK,
            entity_id=task.id,
            changes={"title": task.title, "project_id": str(project_id)}
        )
        
        return task
    
    async def update(self, task_id: UUID, data: TaskUpdate, user_id: UUID) -> Optional[Task]:
        """Update a task"""
        task = await self.get_by_id(task_id)
        if not task:
            return None
        
        update_data = data.model_dump(exclude_unset=True)
        old_status = task.status
        
        # Handle status change to DONE
        if "status" in update_data and update_data["status"] == TaskStatus.DONE:
            if not task.completed_at:
                update_data["completed_at"] = datetime.utcnow()
        
        for field, value in update_data.items():
            setattr(task, field, value)
        
        await self.db.commit()
        await self.db.refresh(task)
        
        # Log activity
        if "status" in update_data and update_data["status"] != old_status:
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.UPDATED,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                changes={"field": "status", "old_value": old_status, "new_value": update_data["status"]}
            )
        elif update_data:
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.UPDATED,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                changes=update_data
            )
            
        return task
    
    async def delete(self, task_id: UUID, user_id: UUID) -> bool:
        """Delete a task"""
        result = await self.db.execute(
            delete(Task).where(Task.id == task_id)
        )
        await self.db.commit()
        
        if result.rowcount > 0:
            # Log activity
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.DELETED,
                entity_type=EntityType.TASK,
                entity_id=task_id
            )
            return True
        return False
    
    async def assign(self, task_id: UUID, assignee_id: UUID, user_id: UUID) -> Optional[Task]:
        """Assign a task to a user"""
        task = await self.get_by_id(task_id)
        if not task:
            return None
        
        old_assignee = task.assigned_to
        task.assigned_to = assignee_id
        await self.db.commit()
        await self.db.refresh(task)
        
        # Log activity
        await self.activity_service.log(
            user_id=user_id,
            action=ActionType.ASSIGNED,
            entity_type=EntityType.TASK,
            entity_id=task.id,
            changes={"assignee_id": str(assignee_id), "old_assignee": str(old_assignee) if old_assignee else None}
        )
        
        return task
    
    async def bulk_update(
        self,
        updates: List[dict],
        user_id: UUID
    ) -> List[Task]:
        """Bulk update tasks (for Kanban drag/drop)"""
        updated_tasks = []
        
        for update_item in updates:
            task_id_str = update_item.get("id")
            if not task_id_str:
                continue
            
            task_id = UUID(task_id_str)
            task = await self.get_by_id(task_id)
            if not task:
                continue
            
            changes = {}
            if "status" in update_item:
                old_status = task.status
                new_status = TaskStatus(update_item["status"])
                if old_status != new_status:
                    task.status = new_status
                    changes["status"] = {"old": old_status, "new": new_status}
                    
            if "position" in update_item:
                task.position = update_item["position"]
                changes["position"] = update_item["position"]
                
            if "epic_id" in update_item:
                task.epic_id = UUID(update_item["epic_id"]) if update_item["epic_id"] else None
                changes["epic_id"] = update_item["epic_id"]
            
            if changes:
                updated_tasks.append(task)
                # Note: Logging bulk updates can be noisy, but it's important for audit trail.
                # In a real app, you might want to log a single "BULK_UPDATE" activity.
        
        await self.db.commit()
        
        # Refresh all tasks
        for task in updated_tasks:
            await self.db.refresh(task)
            
        return updated_tasks
    
    async def get_dependencies(self, task_id: UUID) -> List[Task]:
        """Get all dependency tasks"""
        task = await self.get_by_id(task_id)
        if not task or not task.dependencies:
            return []
        
        result = await self.db.execute(
            select(Task).where(Task.id.in_(task.dependencies))
        )
        return list(result.scalars().all())
    
    async def add_dependency(self, task_id: UUID, dependency_id: UUID, user_id: UUID) -> Optional[Task]:
        """Add a dependency to a task"""
        task = await self.get_by_id(task_id)
        dependency = await self.get_by_id(dependency_id)
        
        if not task or not dependency:
            return None
        
        # Check for circular dependency
        if await self._has_circular_dependency(task_id, dependency_id):
            return None
        
        dependencies = list(task.dependencies) if task.dependencies else []
        if str(dependency_id) not in [str(d) for d in dependencies]:
            dependencies.append(str(dependency_id))
            task.dependencies = dependencies
            await self.db.commit()
            await self.db.refresh(task)
            
            # Log activity
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.UPDATED,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                changes={"added_dependency": str(dependency_id)}
            )
        
        return task
    
    async def remove_dependency(self, task_id: UUID, dependency_id: UUID, user_id: UUID) -> Optional[Task]:
        """Remove a dependency from a task"""
        task = await self.get_by_id(task_id)
        if not task:
            return None
        
        dependencies = list(task.dependencies) if task.dependencies else []
        new_dependencies = [d for d in dependencies if str(d) != str(dependency_id)]
        
        if len(new_dependencies) != len(dependencies):
            task.dependencies = new_dependencies
            await self.db.commit()
            await self.db.refresh(task)
            
            # Log activity
            await self.activity_service.log(
                user_id=user_id,
                action=ActionType.UPDATED,
                entity_type=EntityType.TASK,
                entity_id=task.id,
                changes={"removed_dependency": str(dependency_id)}
            )
            
        return task
    
    async def _get_next_position(self, epic_id: Optional[UUID]) -> int:
        """Get next position for a task in an epic"""
        if not epic_id:
            return 1000
        
        result = await self.db.execute(
            select(Task.position)
            .where(Task.epic_id == epic_id)
            .order_by(Task.position.desc())
            .limit(1)
        )
        max_position = result.scalar_one_or_none()
        return (max_position or 0) + 1000
    
    async def _has_circular_dependency(self, task_id: UUID, new_dep_id: UUID) -> bool:
        """Check if adding dependency would create a circular reference"""
        visited = set()
        queue = [new_dep_id]
        
        while queue:
            current_id = queue.pop(0)
            if current_id == task_id:
                return True
            
            if current_id in visited:
                continue
            visited.add(current_id)
            
            task = await self.get_by_id(current_id)
            if task and task.dependencies:
                for dep_id in task.dependencies:
                    queue.append(UUID(str(dep_id)))
        
        return False

