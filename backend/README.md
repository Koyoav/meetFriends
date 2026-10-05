# KeepClose Backend

FastAPI + MySQL backend for the KeepClose app. See
[`../DESIGN.md`](../DESIGN.md) for the full technical design.

## Running locally (Docker)

```
docker compose up --build
```

This starts MySQL and the API at http://localhost:8080 (mapped from the
container's internal port 8000 to avoid clashing with other local services).
On first run, apply migrations:

```
docker compose exec backend alembic upgrade head
```

API docs: http://localhost:8080/docs

## Running without Docker

1. Create a MySQL database and user matching `.env.example`, or point
   `DATABASE_URL` at your own instance.
2. `cp .env.example .env` and adjust values.
3. `python -m venv .venv && source .venv/bin/activate`
4. `pip install -r requirements.txt`
5. `alembic upgrade head`
6. `uvicorn app.main:app --reload`

## Architecture

- `app/models/` — SQLAlchemy ORM entities (the DB tables)
- `app/schemas/` — Pydantic request/response shapes for the API
- `app/dal/` — data access layer: every direct database query lives here,
  one module per entity. Routers never query the database directly.
- `app/services/` — pure business logic with no database access of its own
  (scoring formula, date math) — it operates on data the DAL already fetched
- `app/routers/` — HTTP endpoints: parse the request, call the DAL/services,
  serialize the response
- `app/core/` — auth/security plumbing (JWT, password hashing, the
  `get_current_user` dependency)

## Testing

Tests live in a `tests/` subfolder next to the code they test
(`app/dal/tests/`, `app/routers/tests/`, `app/services/tests/`,
`app/core/tests/`, `app/tests/` for root-level `app/` files), plus shared
fixtures in `conftest.py` and DB-object factories in `tests/factories.py` at
the backend root. `pytest` discovers all of them automatically — no special
configuration needed per folder.

```
pip install -r requirements-dev.txt
pytest
```

This runs the full suite (fast, in-memory SQLite — no Docker needed) and
enforces **100% branch coverage** (configured in `.coveragerc`/`pytest.ini`;
a drop below 100% fails the run, same as it fails in CI). DAL tests exercise
real queries against the database directly; router tests exercise the full
HTTP stack end-to-end via FastAPI's `TestClient`.
