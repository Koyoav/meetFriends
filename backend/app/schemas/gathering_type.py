from datetime import datetime

from pydantic import BaseModel

from app.models.gathering_type import DEFAULT_REMINDER_THRESHOLD_DAYS, GatheringTypeLabel


class GatheringTypeBase(BaseModel):
    type: GatheringTypeLabel
    custom_label: str | None = None
    reminder_threshold_days: int = DEFAULT_REMINDER_THRESHOLD_DAYS


class GatheringTypeCreate(GatheringTypeBase):
    pass


class GatheringTypeUpdate(BaseModel):
    custom_label: str | None = None
    reminder_threshold_days: int | None = None


class GatheringTypeRead(GatheringTypeBase):
    id: int
    friend_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
