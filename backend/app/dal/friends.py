from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.models import Friend, FriendGatheringType, Person
from app.schemas.friend import FriendCreate, FriendUpdate


def get_friend_or_404(db: Session, friend_id: int, household_id: int) -> Friend:
    friend = (
        db.query(Friend)
        .options(joinedload(Friend.people), joinedload(Friend.gathering_types))
        .filter(Friend.id == friend_id, Friend.household_id == household_id)
        .first()
    )
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend


def list_friends(db: Session, household_id: int) -> list[Friend]:
    return (
        db.query(Friend)
        .options(joinedload(Friend.people), joinedload(Friend.gathering_types))
        .filter(Friend.household_id == household_id)
        .all()
    )


def create_friend(db: Session, household_id: int, payload: FriendCreate) -> Friend:
    friend = Friend(
        household_id=household_id,
        display_name=payload.display_name,
        notes=payload.notes,
        kids_fit_score=payload.kids_fit_score,
        adult_fit_score=payload.adult_fit_score,
        importance_score=payload.importance_score,
    )
    db.add(friend)
    db.flush()

    for person in payload.people:
        db.add(Person(friend_id=friend.id, **person.model_dump()))

    for gathering_type in payload.gathering_types:
        db.add(FriendGatheringType(friend_id=friend.id, **gathering_type.model_dump()))

    db.commit()
    return get_friend_or_404(db, friend.id, household_id)


def update_friend(db: Session, friend: Friend, payload: FriendUpdate) -> Friend:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(friend, field, value)
    db.commit()
    db.refresh(friend)
    return friend


def delete_friend(db: Session, friend: Friend) -> None:
    db.delete(friend)
    db.commit()
