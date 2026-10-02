from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.deps import get_current_user
from app.database import get_db
from app.models import Friend, FriendGatheringType, User
from app.schemas.reminder import ReminderItem
from app.services.reminders import days_since, last_gathering_dates

router = APIRouter(prefix="/reminders", tags=["reminders"])


def _label(gathering_type: FriendGatheringType) -> str:
    return gathering_type.custom_label or gathering_type.type.value


def _sort_key(item: ReminderItem) -> tuple[int, int]:
    if item.days_since_last is None:
        return (0, 0)
    return (1, -item.days_since_last)


@router.get("", response_model=list[ReminderItem])
def list_reminders(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[ReminderItem]:
    friends = (
        db.query(Friend)
        .options(joinedload(Friend.gathering_types))
        .filter(Friend.household_id == current_user.household_id)
        .all()
    )

    gathering_type_ids = [gt.id for friend in friends for gt in friend.gathering_types]
    last_dates = last_gathering_dates(db, gathering_type_ids)

    today = date.today()
    items: list[ReminderItem] = []
    for friend in friends:
        for gathering_type in friend.gathering_types:
            last_date = last_dates.get(gathering_type.id)
            elapsed = days_since(last_date, today)
            overdue = elapsed is None or elapsed > gathering_type.reminder_threshold_days
            if not overdue:
                continue
            days_overdue = None if elapsed is None else elapsed - gathering_type.reminder_threshold_days
            items.append(
                ReminderItem(
                    friend_id=friend.id,
                    friend_display_name=friend.display_name,
                    gathering_type_id=gathering_type.id,
                    gathering_type_label=_label(gathering_type),
                    last_gathering_date=last_date,
                    days_since_last=elapsed,
                    reminder_threshold_days=gathering_type.reminder_threshold_days,
                    days_overdue=days_overdue,
                )
            )

    items.sort(key=_sort_key)
    return items
