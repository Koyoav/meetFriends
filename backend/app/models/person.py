import enum

from sqlalchemy import Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PersonRole(str, enum.Enum):
    ADULT = "adult"
    KID = "kid"


class Person(Base):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(primary_key=True)
    friend_id: Mapped[int] = mapped_column(ForeignKey("friends.id"))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[PersonRole] = mapped_column(Enum(PersonRole))
    birth_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birth_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birth_day: Mapped[int | None] = mapped_column(Integer, nullable=True)

    friend: Mapped["Friend"] = relationship(back_populates="people")
