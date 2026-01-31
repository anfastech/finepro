from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, JSON, ARRAY, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .enums import UserRole
from ..database import Base
from ..utils.id_generator import generate_user_id


class User(Base):
    __tablename__ = "users"

    id = Column(String(12), primary_key=True, default=generate_user_id)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    auth_id = Column(String(255), unique=True, index=True, nullable=True)  # Supabase Auth user ID
    avatar_url = Column(String(500), nullable=True)  # Avatar URL from OAuth provider
    role = Column(SQLEnum(UserRole), default=UserRole.DEVELOPER)
    skills = Column(JSON, default=dict)  # {"react": 9, "python": 7}
    availability = Column(JSON, default=dict)  # vacation dates, max hours/week
    workload_percentage = Column(Integer, default=0)  # current capacity used
    preferences = Column(JSON, default=dict)  # work preferences
    whatsapp_number = Column(String(50), nullable=True)
    notification_settings = Column(JSON, default=dict)
    last_sync = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owned_workspaces = relationship("Workspace", back_populates="owner")
    workspace_memberships = relationship("Member", back_populates="user")
    created_projects = relationship("Project", back_populates="created_by_user")
    assigned_tasks = relationship("Task", back_populates="assigned_user", foreign_keys="[Task.assigned_to]")
    comments = relationship("Comment", back_populates="user")
    activities = relationship("ActivityLog", back_populates="user")