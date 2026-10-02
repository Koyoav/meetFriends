from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.dal import friends as friends_dal
from app.database import get_db
from app.models import Friend, User
from app.schemas.friend import FriendCreate, FriendRead, FriendUpdate

router = APIRouter(prefix="/friends", tags=["friends"])


@router.get("", response_model=list[FriendRead])
def list_friends(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[Friend]:
    return friends_dal.list_friends(db, current_user.household_id)


@router.post("", response_model=FriendRead, status_code=status.HTTP_201_CREATED)
def create_friend(
    payload: FriendCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Friend:
    return friends_dal.create_friend(db, current_user.household_id, payload)


@router.get("/{friend_id}", response_model=FriendRead)
def get_friend(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Friend:
    return friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)


@router.patch("/{friend_id}", response_model=FriendRead)
def update_friend(
    friend_id: int,
    payload: FriendUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Friend:
    friend = friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    return friends_dal.update_friend(db, friend, payload)


@router.delete("/{friend_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_friend(
    friend_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    friend = friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    friends_dal.delete_friend(db, friend)
