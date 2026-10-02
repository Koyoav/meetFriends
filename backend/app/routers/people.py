from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.dal import friends as friends_dal
from app.dal import people as people_dal
from app.database import get_db
from app.models import Person, User
from app.schemas.person import PersonCreate, PersonRead, PersonUpdate

router = APIRouter(prefix="/friends/{friend_id}/people", tags=["people"])


@router.post("", response_model=PersonRead, status_code=status.HTTP_201_CREATED)
def add_person(
    friend_id: int,
    payload: PersonCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Person:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    return people_dal.add_person(db, friend_id, payload)


@router.patch("/{person_id}", response_model=PersonRead)
def update_person(
    friend_id: int,
    person_id: int,
    payload: PersonUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Person:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    person = people_dal.get_person_or_404(db, friend_id, person_id)
    return people_dal.update_person(db, person, payload)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(
    friend_id: int,
    person_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    friends_dal.get_friend_or_404(db, friend_id, current_user.household_id)
    person = people_dal.get_person_or_404(db, friend_id, person_id)
    people_dal.delete_person(db, person)
