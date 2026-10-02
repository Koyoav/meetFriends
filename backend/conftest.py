import pytest
from fastapi.testclient import TestClient
from sqlalchemy import StaticPool, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app import models  # noqa: F401  registers all models on Base.metadata
from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def db_session():
    """A raw SQLAlchemy session against a fresh in-memory SQLite DB.

    For DAL/service-level tests that talk to the database directly,
    without going through the HTTP layer.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session: Session = testing_session_local()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session):
    """A FastAPI TestClient wired to the same DB as db_session.

    For router-level integration tests that exercise real HTTP endpoints.
    """

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
