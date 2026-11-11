from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel

from app.models.gathering import GatheringLocation


class GatheringBase(BaseModel):
    gathering_type_id: int
    date: date_type
    location: GatheringLocation
    notes: str | None = None


class GatheringCreate(GatheringBase):
    pass


class GatheringUpdate(BaseModel):
    gathering_type_id: int | None = None
    date: date_type | None = None
    location: GatheringLocation | None = None
    notes: str | None = None


class GatheringRead(GatheringBase):
    id: int
    friend_id: int
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
