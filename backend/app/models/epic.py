from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, JSON, ARRAY, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .enums import Priority, EpicStatus
from ..database import Base
from ..utils.id_generator import generate_epic_id


class Epic(Base):
    __tablename__ = "epics"

    id = Column(String(10), primary_key=True, default=generate_epic_id)
    project_id = Column(String(12), ForeignKey("projects.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(SQLEnum(Priority), default=Priority.MEDIUM)
    status = Column(SQLEnum(EpicStatus), default=EpicStatus.TODO)
    estimated_hours = Column(Float, nullable=True)
    actual_hours = Column(Float, default=0.0)
    sequence_order = Column(Integer, nullable=True)  # for dependencies/ordering
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="epics")
    tasks = relationship("Task", back_populates="epic")