from datetime import date

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models import (
    Friend,
    FriendGatheringType,
    Gathering,
    GatheringLocation,
    GatheringTypeLabel,
    Household,
    Person,
    PersonRole,
    User,
)


def make_household(db: Session, name: str = "Test Household") -> Household:
    household = Household(name=name)
    db.add(household)
    db.commit()
    db.refresh(household)
    return household


def make_user(
    db: Session,
    household: Household,
    email: str = "user@example.com",
    password: str = "secret123",
    name: str = "Test User",
) -> User:
    user = User(
        household_id=household.id,
        email=email,
        password_hash=hash_password(password),
        name=name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def make_friend(
    db: Session,
    household: Household,
    display_name: str = "Test Friend",
    adult_fit_score: int = 8,
    kids_fit_score: int | None = None,
    importance_score: int = 8,
    notes: str | None = None,
) -> Friend:
    friend = Friend(
        household_id=household.id,
        display_name=display_name,
        notes=notes,
        kids_fit_score=kids_fit_score,
        adult_fit_score=adult_fit_score,
        importance_score=importance_score,
    )
    db.add(friend)
    db.commit()
    db.refresh(friend)
    return friend


def make_person(
    db: Session,
    friend: Friend,
    name: str = "Test Person",
    role: PersonRole = PersonRole.ADULT,
    birth_year: int | None = None,
    birth_month: int | None = None,
    birth_day: int | None = None,
) -> Person:
    person = Person(
        friend_id=friend.id,
        name=name,
        role=role,
        birth_year=birth_year,
        birth_month=birth_month,
        birth_day=birth_day,
    )
    db.add(person)
    db.commit()
    db.refresh(person)
    return person


def make_gathering_type(
    db: Session,
    friend: Friend,
    type: GatheringTypeLabel = GatheringTypeLabel.FAMILY,
    custom_label: str | None = None,
    reminder_threshold_days: int = 60,
) -> FriendGatheringType:
    gathering_type = FriendGatheringType(
        friend_id=friend.id,
        type=type,
        custom_label=custom_label,
        reminder_threshold_days=reminder_threshold_days,
    )
    db.add(gathering_type)
    db.commit()
    db.refresh(gathering_type)
    return gathering_type


def make_gathering(
    db: Session,
    friend: Friend,
    gathering_type: FriendGatheringType,
    user: User,
    gathering_date: date,
    location: GatheringLocation = GatheringLocation.OUR_PLACE,
    notes: str | None = None,
) -> Gathering:
    gathering = Gathering(
        friend_id=friend.id,
        gathering_type_id=gathering_type.id,
        date=gathering_date,
        location=location,
        notes=notes,
        created_by=user.id,
    )
    db.add(gathering)
    db.commit()
    db.refresh(gathering)
    return gathering
