from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Friend, Person
from app.schemas.person import PersonCreate, PersonUpdate


def get_person_or_404(db: Session, friend_id: int, person_id: int) -> Person:
    person = (
        db.query(Person)
        .filter(Person.id == person_id, Person.friend_id == friend_id)
        .first()
    )
    if person is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Person not found")
    return person


def add_person(db: Session, friend_id: int, payload: PersonCreate) -> Person:
    person = Person(friend_id=friend_id, **payload.model_dump())
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def update_person(db: Session, person: Person, payload: PersonUpdate) -> Person:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, field, value)
    db.commit()
    db.refresh(person)
    return person


def delete_person(db: Session, person: Person) -> None:
    db.delete(person)
    db.commit()


def list_with_birth_month(db: Session, household_id: int, month: int) -> list[Person]:
    return (
        db.query(Person)
        .join(Person.friend)
        .filter(
            Friend.household_id == household_id,
            Person.birth_month == month,
            Person.birth_day.isnot(None),
        )
        .all()
    )
