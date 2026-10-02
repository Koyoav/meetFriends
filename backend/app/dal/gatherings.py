from collections.abc import Iterable
from datetime import date as date_type

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.dal.gathering_types import find_gathering_type
from app.models import FriendGatheringType, Gathering, GatheringTypeLabel
from app.schemas.gathering import GatheringCreate
from app.schemas.invite_planning import GatheringTypeFilter


def list_gatherings(db: Session, friend_id: int) -> list[Gathering]:
    return (
        db.query(Gathering)
        .filter(Gathering.friend_id == friend_id)
        .order_by(Gathering.date.desc())
        .all()
    )


def log_gathering(
    db: Session, friend_id: int, created_by: int, payload: GatheringCreate
) -> Gathering:
    gathering_type = find_gathering_type(db, friend_id, payload.gathering_type_id)
    if gathering_type is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gathering type does not belong to this friend",
        )

    gathering = Gathering(friend_id=friend_id, created_by=created_by, **payload.model_dump())
    db.add(gathering)
    db.commit()
    db.refresh(gathering)
    return gathering


def get_last_gathering_dates_by_type(
    db: Session, gathering_type_ids: Iterable[int]
) -> dict[int, date_type]:
    gathering_type_ids = list(gathering_type_ids)
    if not gathering_type_ids:
        return {}
    rows = (
        db.query(Gathering.gathering_type_id, func.max(Gathering.date))
        .filter(Gathering.gathering_type_id.in_(gathering_type_ids))
        .group_by(Gathering.gathering_type_id)
        .all()
    )
    return dict(rows)


def get_last_gathering_date_for_friend(
    db: Session, friend_id: int, gathering_type: GatheringTypeFilter
) -> date_type | None:
    query = db.query(func.max(Gathering.date)).filter(Gathering.friend_id == friend_id)
    if gathering_type != GatheringTypeFilter.ALL:
        query = query.join(Gathering.gathering_type).filter(
            FriendGatheringType.type == GatheringTypeLabel(gathering_type.value)
        )
    return query.scalar()
