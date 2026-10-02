from datetime import date, datetime

from pydantic import BaseModel

from app.models.gathering import GatheringLocation


class GatheringBase(BaseModel):
    gathering_type_id: int
    date: date
    location: GatheringLocation
    notes: str | None = None


class GatheringCreate(GatheringBase):
    pass


class GatheringRead(GatheringBase):
    id: int
    friend_id: int
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
