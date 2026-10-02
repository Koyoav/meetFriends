from sqlalchemy.orm import Session

from app.models import User


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_user(
    db: Session, household_id: int, email: str, password_hash: str, name: str
) -> User:
    user = User(
        household_id=household_id,
        email=email,
        password_hash=password_hash,
        name=name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
