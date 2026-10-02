from pydantic import BaseModel

from app.models.person import PersonRole


class BirthdayItem(BaseModel):
    friend_id: int
    friend_display_name: str
    person_id: int
    person_name: str
    role: PersonRole
    birth_month: int
    birth_day: int
    birth_year: int | None
    turning_age: int | None
    days_until: int
