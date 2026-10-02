from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.dal import friends as friends_dal
from app.dal import gatherings as gatherings_dal
from app.database import get_db
from app.models import Gathering, User
from app.schemas.gathering import GatheringCreate, GatheringRead

router = APIRouter(prefix="/friends/{friend_id}/gatherings", tags=["gatherings"])


@router.get("", response_model=list[GatheringRead])
def list_gatherings(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Gathering]:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    return gatherings_dal.list_gatherings(db, friend_id)


@router.post("", response_model=GatheringRead, status_code=status.HTTP_201_CREATED)
def log_gathering(
    friend_id: int,
    payload: GatheringCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Gathering:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    return gatherings_dal.log_gathering(db, friend_id, current_user.id, payload)
