from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Friend, FriendGatheringType, User
from app.schemas.gathering_type import (
    GatheringTypeCreate,
    GatheringTypeRead,
    GatheringTypeUpdate,
)

router = APIRouter(prefix="/friends/{friend_id}/gathering-types", tags=["gathering-types"])


def _get_friend_or_404(db: Session, friend_id: int, household_id: int) -> Friend:
    friend = (
        db.query(Friend)
        .filter(Friend.id == friend_id, Friend.household_id == household_id)
        .first()
    )
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend


def _get_gathering_type_or_404(
    db: Session, friend_id: int, gathering_type_id: int
) -> FriendGatheringType:
    gathering_type = (
        db.query(FriendGatheringType)
        .filter(
            FriendGatheringType.id == gathering_type_id,
            FriendGatheringType.friend_id == friend_id,
        )
        .first()
    )
    if gathering_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gathering type not found"
        )
    return gathering_type


@router.post("", response_model=GatheringTypeRead, status_code=status.HTTP_201_CREATED)
def add_gathering_type(
    friend_id: int,
    payload: GatheringTypeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendGatheringType:
    _get_friend_or_404(db, friend_id, current_user.household_id)
    gathering_type = FriendGatheringType(friend_id=friend_id, **payload.model_dump())
    db.add(gathering_type)
    db.commit()
    db.refresh(gathering_type)
    return gathering_type


@router.patch("/{gathering_type_id}", response_model=GatheringTypeRead)
def update_gathering_type(
    friend_id: int,
    gathering_type_id: int,
    payload: GatheringTypeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendGatheringType:
    _get_friend_or_404(db, friend_id, current_user.household_id)
    gathering_type = _get_gathering_type_or_404(db, friend_id, gathering_type_id)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(gathering_type, field, value)
    db.commit()
    db.refresh(gathering_type)
    return gathering_type


@router.delete("/{gathering_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gathering_type(
    friend_id: int,
    gathering_type_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _get_friend_or_404(db, friend_id, current_user.household_id)
    gathering_type = _get_gathering_type_or_404(db, friend_id, gathering_type_id)
    db.delete(gathering_type)
    db.commit()
