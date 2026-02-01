from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, JSON, ARRAY, Text, ForeignKey, Enum as SQLEnum, Table

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from ..utils.id_generator import generate_sprint_id

from .enums import SprintStatus
from ..database import Base


class Sprint(Base):
    __tablename__ = "sprints"

    id = Column(String(10), primary_key=True, default=generate_sprint_id)
    project_id = Column(String(12), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(SQLEnum(SprintStatus), default=SprintStatus.PLANNING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="sprints")
    tasks = relationship("SprintTask", back_populates="sprint")


# Explicit relationship class for more control
class SprintTask(Base):
    __tablename__ = "sprint_task_details"


    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sprint_id = Column(String(10), ForeignKey("sprints.id"), nullable=False)
    task_id = Column(String(10), ForeignKey("tasks.id"), nullable=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    sprint = relationship("Sprint")
    task = relationship("Task", back_populates="sprint_tasks")