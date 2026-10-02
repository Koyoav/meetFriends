from pydantic import BaseModel

from app.models.person import PersonRole


class PersonBase(BaseModel):
    name: str
    role: PersonRole
    birth_year: int | None = None


class PersonCreate(PersonBase):
    pass


class PersonRead(PersonBase):
    id: int

    model_config = {"from_attributes": True}
