import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jose import jwt

from app.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, create_refresh_token
from tests.factories import make_household, make_user


def _credentials(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _raw_token(**payload) -> str:
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


class TestGetCurrentUser:
    def test_get_current_user__valid_access_token_for_existing_user__returns_user(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        token = create_access_token(user.id)

        # Act
        result = get_current_user(_credentials(token), db_session)

        # Assert
        assert result.id == user.id

    def test_get_current_user__garbage_token__raises_401(self, db_session):
        # Arrange
        # (no setup needed)

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(_credentials("not-a-real-token"), db_session)
        assert exc_info.value.status_code == 401

    def test_get_current_user__refresh_token_used_as_access_token__raises_401(
        self, db_session
    ):
        # Arrange
        household = make_household(db_session)
        user = make_user(db_session, household)
        token = create_refresh_token(user.id)

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(_credentials(token), db_session)
        assert exc_info.value.status_code == 401

    def test_get_current_user__token_missing_subject_claim__raises_401(self, db_session):
        # Arrange
        token = _raw_token(type="access")

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(_credentials(token), db_session)
        assert exc_info.value.status_code == 401

    def test_get_current_user__subject_claim_not_an_integer__raises_401(self, db_session):
        # Arrange
        token = _raw_token(type="access", sub="not-an-integer")

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(_credentials(token), db_session)
        assert exc_info.value.status_code == 401

    def test_get_current_user__user_no_longer_exists__raises_401(self, db_session):
        # Arrange
        token = create_access_token(999999)

        # Act / Assert
        with pytest.raises(HTTPException) as exc_info:
            get_current_user(_credentials(token), db_session)
        assert exc_info.value.status_code == 401
