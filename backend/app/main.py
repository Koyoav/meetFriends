from fastapi import FastAPI

from app.routers import (
    auth,
    birthdays,
    friends,
    gathering_types,
    gatherings,
    invite_planning,
    people,
    reminders,
)

app = FastAPI(title="KeepClose API")

app.include_router(auth.router)
app.include_router(friends.router)
app.include_router(people.router)
app.include_router(gathering_types.router)
app.include_router(gatherings.router)
app.include_router(reminders.router)
app.include_router(invite_planning.router)
app.include_router(birthdays.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
