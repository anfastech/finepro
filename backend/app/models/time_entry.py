import uuid
from sqlalchemy import Column, DateTime, Float, ForeignKey, String

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class TimeEntry(Base):
    __tablename__ = 'time_entries'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    task_id = Column(String(10), ForeignKey('tasks.id'), nullable=False)
    user_id = Column(String(12), ForeignKey('users.id'), nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now())
    end_time = Column(DateTime(timezone=True), nullable=True)
    hours = Column(Float, nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    task = relationship('Task', back_populates='time_logs')
    user = relationship('User')
