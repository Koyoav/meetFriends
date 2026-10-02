from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Friend, FriendGatheringType, Gathering, User
from app.schemas.gathering import GatheringCreate, GatheringRead

router = APIRouter(prefix="/friends/{friend_id}/gatherings", tags=["gatherings"])


def _get_friend_or_404(db: Session, friend_id: int, household_id: int) -> Friend:
    friend = (
        db.query(Friend)
        .filter(Friend.id == friend_id, Friend.household_id == household_id)
        .first()
    )
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend


@router.get("", response_model=list[GatheringRead])
def list_gatherings(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[Gathering]:
    _get_friend_or_404(db, friend_id, current_user.household_id)
    return (
        db.query(Gathering)
        .filter(Gathering.friend_id == friend_id)
        .order_by(Gathering.date.desc())
        .all()
    )


@router.post("", response_model=GatheringRead, status_code=status.HTTP_201_CREATED)
def log_gathering(
    friend_id: int,
    payload: GatheringCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Gathering:
    _get_friend_or_404(db, friend_id, current_user.household_id)
    gathering_type = (
        db.query(FriendGatheringType)
        .filter(
            FriendGatheringType.id == payload.gathering_type_id,
            FriendGatheringType.friend_id == friend_id,
        )
        .first()
    )
    if gathering_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gathering type does not belong to this friend",
        )

    gathering = Gathering(friend_id=friend_id, created_by=current_user.id, **payload.model_dump())
    db.add(gathering)
    db.commit()
    db.refresh(gathering)
    return gathering
