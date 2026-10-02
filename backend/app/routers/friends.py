from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Friend, FriendGatheringType, Person, User
from app.schemas.friend import FriendCreate, FriendRead, FriendUpdate

router = APIRouter(prefix="/friends", tags=["friends"])


def _get_friend_or_404(db: Session, friend_id: int, household_id: int) -> Friend:
    friend = (
        db.query(Friend)
        .options(joinedload(Friend.people), joinedload(Friend.gathering_types))
        .filter(Friend.id == friend_id, Friend.household_id == household_id)
        .first()
    )
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend


@router.get("", response_model=list[FriendRead])
def list_friends(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[Friend]:
    return (
        db.query(Friend)
        .options(joinedload(Friend.people), joinedload(Friend.gathering_types))
        .filter(Friend.household_id == current_user.household_id)
        .all()
    )


@router.post("", response_model=FriendRead, status_code=status.HTTP_201_CREATED)
def create_friend(
    payload: FriendCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Friend:
    friend = Friend(
        household_id=current_user.household_id,
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
    return _get_friend_or_404(db, friend.id, current_user.household_id)


@router.get("/{friend_id}", response_model=FriendRead)
def get_friend(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Friend:
    return _get_friend_or_404(db, friend_id, current_user.household_id)


@router.patch("/{friend_id}", response_model=FriendRead)
def update_friend(
    friend_id: int,
    payload: FriendUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Friend:
    friend = _get_friend_or_404(db, friend_id, current_user.household_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(friend, field, value)
    db.commit()
    db.refresh(friend)
    return friend


@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_friend(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    friend = _get_friend_or_404(db, friend_id, current_user.household_id)
    db.delete(friend)
    db.commit()
