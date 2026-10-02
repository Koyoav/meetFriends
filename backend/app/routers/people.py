from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Friend, Person, User
from app.schemas.person import PersonCreate, PersonRead

router = APIRouter(prefix="/friends/{friend_id}/people", tags=["people"])


def _get_friend_or_404(db: Session, friend_id: int, household_id: int) -> Friend:
    friend = (
        db.query(Friend)
        .filter(Friend.id == friend_id, Friend.household_id == household_id)
        .first()
    )
    if friend is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friend not found")
    return friend


@router.post("", response_model=PersonRead, status_code=status.HTTP_201_CREATED)
def add_person(
    friend_id: int,
    payload: PersonCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Person:
    _get_friend_or_404(db, friend_id, current_user.household_id)
    person = Person(friend_id=friend_id, **payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(
    friend_id: int,
    person_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _get_friend_or_404(db, friend_id, current_user.household_id)
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.friend_id == friend_id)
        .first()
    )
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    db.delete(person)
    db.commit()
