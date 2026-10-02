from pydantic import BaseModel, Field, model_validator

from app.models.person import PersonRole


class PersonBase(BaseModel):
    name: str
    role: PersonRole
    birth_year: int | None = None
    birth_month: int | None = Field(default=None, ge=1, le=12)
    birth_day: int | None = Field(default=None, ge=1, le=31)

    @model_validator(mode="after")
    def _birth_month_day_together(self) -> "PersonBase":
        if (self.birth_month is None) != (self.birth_day is None):
            raise ValueError("birth_month and birth_day must be provided together")
        return self


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    name: str | None = None
    role: PersonRole | None = None
    birth_year: int | None = None
    birth_month: int | None = Field(default=None, ge=1, le=12)
    birth_day: int | None = Field(default=None, ge=1, le=31)

    @model_validator(mode="after")
    def _birth_month_day_together(self) -> "PersonUpdate":
        if (self.birth_month is None) != (self.birth_day is None):
            raise ValueError("birth_month and birth_day must be provided together")
        return self


class PersonRead(PersonBase):
    id: int

    model_config = {"from_attributes": True}
