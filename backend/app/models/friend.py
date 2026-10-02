from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Friend(Base):
    __tablename__ = "friends"

    id: Mapped[int] = mapped_column(primary_key=True)
    household_id: Mapped[int] = mapped_column(ForeignKey("households.id"))
    display_name: Mapped[str] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    kids_fit_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    adult_fit_score: Mapped[int] = mapped_column(Integer)
    importance_score: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    household: Mapped["Household"] = relationship(back_populates="friends")
    people: Mapped[list["Person"]] = relationship(
        back_populates="friend", cascade="all, delete-orphan"
    )
    gathering_types: Mapped[list["FriendGatheringType"]] = relationship(
        back_populates="friend", cascade="all, delete-orphan"
    )
    gatherings: Mapped[list["Gathering"]] = relationship(
        back_populates="friend", cascade="all, delete-orphan"
    )
