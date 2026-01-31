from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, JSON, ARRAY, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .enums import ProjectStatus
from ..database import Base
from ..utils.id_generator import generate_project_id


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(12), primary_key=True, default=generate_project_id)
    workspace_id = Column(String(12), ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    tech_stack = Column(JSON, default=dict)  # frontend, backend, database, hosting
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.PLANNING)
    ai_generated = Column(Boolean, default=False)
    complexity_score = Column(Float, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    target_end_date = Column(DateTime(timezone=True), nullable=True)
    actual_end_date = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(String(12), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="projects")
    created_by_user = relationship("User", back_populates="created_projects")
    epics = relationship("Epic", back_populates="project")
    sprints = relationship("Sprint", back_populates="project")