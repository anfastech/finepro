from sqlalchemy import Column, String, DateTime, Float, Integer, Boolean, JSON, ARRAY, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .enums import MemberRole
from ..database import Base
from ..utils.id_generator import generate_member_id


class Member(Base):
    __tablename__ = "members"

    id = Column(String(10), primary_key=True, default=generate_member_id)
    user_id = Column(String(12), ForeignKey("users.id"), nullable=False)
    workspace_id = Column(String(12), ForeignKey("workspaces.id"), nullable=False)
    role = Column(SQLEnum(MemberRole), default=MemberRole.MEMBER)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="workspace_memberships")
    workspace = relationship("Workspace", back_populates="members")