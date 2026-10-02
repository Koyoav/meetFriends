# MeetFriends Backend

FastAPI + MySQL backend for the MeetFriends app. See
[`../DESIGN.md`](../DESIGN.md) for the full technical design.

## Running locally (Docker)

```
docker compose up --build
```

This starts MySQL and the API at http://localhost:8000. On first run, apply
migrations:

```
docker compose exec backend alembic upgrade head
```

API docs: http://localhost:8000/docs

## Running without Docker

1. Create a MySQL database and user matching `.env.example`, or point
   `DATABASE_URL` at your own instance.
2. `cp .env.example .env` and adjust values.
3. `python -m venv .venv && source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `alembic upgrade head`
6. `uvicorn app.main:app --reload`
