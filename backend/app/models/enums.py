import enum


class Priority(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    DEVELOPER = "developer"
    DESIGNER = "designer"


class MemberRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class EpicStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskType(str, enum.Enum):
    FRONTEND = "frontend"
    BACKEND = "backend"
    DESIGN = "design"
    TESTING = "testing"
    DEVOPS = "devops"
    DOCUMENTATION = "documentation"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    DONE = "done"
    BLOCKED = "blocked"


class SprintStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    COMPLETED = "completed"


class ActionType(str, enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    COMPLETED = "completed"
    ASSIGNED = "assigned"


class EntityType(str, enum.Enum):
    TASK = "task"
    EPIC = "epic"
    PROJECT = "project"
    WORKSPACE = "workspace"
    USER = "user"