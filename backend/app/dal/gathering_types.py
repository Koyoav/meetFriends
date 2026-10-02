from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import FriendGatheringType
from app.schemas.gathering_type import GatheringTypeCreate, GatheringTypeUpdate


def find_gathering_type(
    db: Session, friend_id: int, gathering_type_id: int
) -> FriendGatheringType | None:
    return (
        db.query(FriendGatheringType)
        .filter(
            FriendGatheringType.id == gathering_type_id,
            FriendGatheringType.friend_id == friend_id,
        )
        .first()
    )


def get_gathering_type_or_404(
    db: Session, friend_id: int, gathering_type_id: int
) -> FriendGatheringType:
    gathering_type = find_gathering_type(db, friend_id, gathering_type_id)
    if gathering_type is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Gathering type not found"
        )
    return gathering_type


def add_gathering_type(
    db: Session, friend_id: int, payload: GatheringTypeCreate
) -> FriendGatheringType:
    gathering_type = FriendGatheringType(friend_id=friend_id, **payload.model_dump())
    db.add(gathering_type)
    db.commit()
    db.refresh(gathering_type)
    return gathering_type


def update_gathering_type(
    db: Session, gathering_type: FriendGatheringType, payload: GatheringTypeUpdate
) -> FriendGatheringType:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(gathering_type, field, value)
    db.commit()
    db.refresh(gathering_type)
    return gathering_type


def delete_gathering_type(db: Session, gathering_type: FriendGatheringType) -> None:
    db.delete(gathering_type)
    db.commit()
