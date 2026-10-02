from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models import User
from app.schemas.birthday import BirthdayItem
from app.services.birthdays import birthdays_for_month

router = APIRouter(prefix="/birthdays", tags=["birthdays"])


@router.get("", response_model=list[BirthdayItem])
def list_birthdays(
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    target_month = month or date.today().month
    return birthdays_for_month(db, current_user.household_id, target_month)
