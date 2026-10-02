import enum
from datetime import date as date_type
from datetime import datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class GatheringLocation(str, enum.Enum):
    OUR_PLACE = "OUR_PLACE"
    THEIR_PLACE = "THEIR_PLACE"
    OUTSIDE = "OUTSIDE"


class Gathering(Base):
    __tablename__ = "gatherings"

    id: Mapped[int] = mapped_column(primary_key=True)
    friend_id: Mapped[int] = mapped_column(ForeignKey("friends.id"))
    gathering_type_id: Mapped[int] = mapped_column(ForeignKey("friend_gathering_types.id"))
    date: Mapped[date_type] = mapped_column(Date)
    location: Mapped[GatheringLocation] = mapped_column(Enum(GatheringLocation))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    friend: Mapped["Friend"] = relationship(back_populates="gatherings")
    gathering_type: Mapped["FriendGatheringType"] = relationship(back_populates="gatherings")
