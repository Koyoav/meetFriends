from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.gathering_type import GatheringTypeCreate, GatheringTypeRead
from app.schemas.person import PersonCreate, PersonRead


class FriendBase(BaseModel):
    display_name: str
    notes: str | None = None
    kids_fit_score: int | None = Field(default=None, ge=1, le=10)
    adult_fit_score: int = Field(ge=1, le=10)
    importance_score: int = Field(ge=1, le=10)


class FriendCreate(FriendBase):
    people: list[PersonCreate] = []
    gathering_types: list[GatheringTypeCreate] = []


class FriendUpdate(BaseModel):
    display_name: str | None = None
    notes: str | None = None
    kids_fit_score: int | None = Field(default=None, ge=1, le=10)
    adult_fit_score: int | None = Field(default=None, ge=1, le=10)
    importance_score: int | None = Field(default=None, ge=1, le=10)


class FriendRead(FriendBase):
    id: int
    household_id: int
    created_at: datetime
    updated_at: datetime
    people: list[PersonRead] = []
    gathering_types: list[GatheringTypeRead] = []

    model_config = {"from_attributes": True}
