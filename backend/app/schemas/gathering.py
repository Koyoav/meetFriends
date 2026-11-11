from datetime import date as date_type
from datetime import datetime

from pydantic import BaseModel, model_validator

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

    @model_validator(mode="after")
    def reject_explicit_null_for_required_fields(self) -> "GatheringUpdate":
        provided = self.model_fields_set
        for field in ("gathering_type_id", "date", "location"):
            if field in provided and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")
        return self


class GatheringRead(GatheringBase):
    id: int
    friend_id: int
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}
