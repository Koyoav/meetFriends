from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


class TestSecurity:
    def test_hash_password__then_verify_with_correct_password__returns_true(self):
        # Arrange
        password = "secret123"
        password_hash = hash_password(password)

        # Act
        result = verify_password(password, password_hash)

        # Assert
        assert result is True

    def test_hash_password__then_verify_with_wrong_password__returns_false(self):
        # Arrange
        password_hash = hash_password("secret123")

        # Act
        result = verify_password("wrong-password", password_hash)

        # Assert
        assert result is False

    def test_create_access_token__then_decode__has_type_access_and_correct_subject(self):
        # Arrange
        user_id = 42

        # Act
        token = create_access_token(user_id)
        payload = decode_token(token)

        # Assert
        assert payload["type"] == "access"
        assert payload["sub"] == str(user_id)

    def test_create_refresh_token__then_decode__has_type_refresh_and_correct_subject(self):
        # Arrange
        user_id = 42

        # Act
        token = create_refresh_token(user_id)
        payload = decode_token(token)

        # Assert
        assert payload["type"] == "refresh"
        assert payload["sub"] == str(user_id)
