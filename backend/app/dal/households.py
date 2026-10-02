from sqlalchemy.orm import Session

from app.models import Household


def create_household(db: Session, name: str) -> Household:
    household = Household(name=name)
    db.add(household)
    db.flush()
    return household
