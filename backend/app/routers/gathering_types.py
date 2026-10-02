from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.dal import friends as friends_dal
from app.dal import gathering_types as gathering_types_dal
from app.database import get_db
from app.models import FriendGatheringType, User
from app.schemas.gathering_type import (
    GatheringTypeCreate,
    GatheringTypeRead,
    GatheringTypeUpdate,
)

router = APIRouter(prefix="/friends/{friend_id}/gathering-types", tags=["gathering-types"])


@router.post("", response_model=GatheringTypeRead, status_code=status.HTTP_201_CREATED)
def add_gathering_type(
    friend_id: int,
    payload: GatheringTypeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendGatheringType:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    return gathering_types_dal.add_gathering_type(db, friend_id, payload)


@router.patch("/{gathering_type_id}", response_model=GatheringTypeRead)
def update_gathering_type(
    friend_id: int,
    gathering_type_id: int,
    payload: GatheringTypeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FriendGatheringType:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    gathering_type = gathering_types_dal.get_gathering_type_or_404(
        db, friend_id, gathering_type_id
    )
    return gathering_types_dal.update_gathering_type(db, gathering_type, payload)


@router.delete("/{gathering_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_gathering_type(
    friend_id: int,
    gathering_type_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    gathering_type = gathering_types_dal.get_gathering_type_or_404(
        db, friend_id, gathering_type_id
    )
    gathering_types_dal.delete_gathering_type(db, gathering_type)
