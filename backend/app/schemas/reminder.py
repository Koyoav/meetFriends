from datetime import date

from pydantic import BaseModel


class ReminderItem(BaseModel):
    friend_id: int
    friend_display_name: str
    gathering_type_id: int
    gathering_type_label: str
    last_gathering_date: date | None
    days_since_last: int | None
    reminder_threshold_days: int
    days_overdue: int | None
