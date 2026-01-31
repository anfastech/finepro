from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from ....database import get_db
from ....models.user import User
from ....models.member import Member
from ....services.member_service import MemberService
from ....api.deps import get_current_user
from ....schemas.common import CommonResponse

router = APIRouter()

@router.get("/workspaces/{workspace_id}/members", response_model=List[User])
async def list_members(workspace_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    svc = MemberService(db)
    return await svc.list_members(workspace_id)
