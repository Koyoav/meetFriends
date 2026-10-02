from datetime import date
from enum import Enum

from pydantic import BaseModel


class GatheringTypeFilter(str, Enum):
    ALL = "ALL"
    FAMILY = "FAMILY"
    MEN_1_1 = "MEN_1_1"
    WOMEN_1_1 = "WOMEN_1_1"
    KIDS_ONLY = "KIDS_ONLY"


class InvitePlanningSort(str, Enum):
    STALENESS = "staleness"
    KIDS_FIT = "kids_fit"
    ADULT_FIT = "adult_fit"
    COMBINED = "combined"


class InvitePlanningItem(BaseModel):
    friend_id: int
    display_name: str
    kids_fit_score: int | None
    adult_fit_score: int
    importance_score: int
    combined_score: float
    last_gathering_date: date | None
    days_since_last: int | None
