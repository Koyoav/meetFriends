import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

DEFAULT_REMINDER_THRESHOLD_DAYS = 60


class GatheringTypeLabel(str, enum.Enum):
    FAMILY = "FAMILY"
    MEN_1_1 = "MEN_1_1"
    WOMEN_1_1 = "WOMEN_1_1"
    KIDS_ONLY = "KIDS_ONLY"
    CUSTOM = "CUSTOM"


class FriendGatheringType(Base):
    __tablename__ = "friend_gathering_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    friend_id: Mapped[int] = mapped_column(ForeignKey("friends.id"))
    type: Mapped[GatheringTypeLabel] = mapped_column(Enum(GatheringTypeLabel))
    custom_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reminder_threshold_days: Mapped[int] = mapped_column(
        Integer, default=DEFAULT_REMINDER_THRESHOLD_DAYS
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    friend: Mapped["Friend"] = relationship(back_populates="gathering_types")
    gatherings: Mapped[list["Gathering"]] = relationship(back_populates="gathering_type")
