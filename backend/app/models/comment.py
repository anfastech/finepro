from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, JSON, ARRAY, Text, ForeignKey, Enum as SQLEnum

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
import uuid
from ..utils.id_generator import generate_comment_id

from ..database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String(12), primary_key=True, default=generate_comment_id)
    task_id = Column(String(10), ForeignKey("tasks.id"), nullable=False)
    user_id = Column(String(12), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")