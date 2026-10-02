from app.core.security import create_refresh_token


class TestAuthRouter:
    def test_signup__new_email__returns_201_with_tokens(self, client):
        # Arrange
        payload = {
            "household_name": "Our Household",
            "name": "Yoav",
            "email": "yoav@example.com",
            "password": "secret123",
        }

        # Act
        response = client.post("/auth/signup", json=payload)

        # Assert
        assert response.status_code == 201
        body = response.json()
        assert "access_token" in body
        assert "refresh_token" in body

    def test_signup__email_already_registered__returns_400(self, client, signup_tokens):
        # Arrange
        signup_tokens(email="yoav@example.com")

        # Act
        response = client.post(
            "/auth/signup",
            json={
                "household_name": "Another Household",
                "name": "Someone Else",
                "email": "yoav@example.com",
                "password": "secret456",
            },
        )

        # Assert
        assert response.status_code == 400

    def test_invite__authenticated_user_with_new_email__adds_member_to_same_household(
        self, client, auth_headers
    ):
        # Arrange
        headers = auth_headers()

        # Act
        response = client.post(
            "/auth/invite",
            json={"name": "Wife", "email": "wife@example.com", "password": "secret456"},
            headers=headers,
        )

        # Assert
        assert response.status_code == 201
        assert "access_token" in response.json()

    def test_invite__email_already_registered__returns_400(
        self, client, auth_headers, signup_tokens
    ):
        # Arrange
        headers = auth_headers(email="yoav@example.com")
        signup_tokens(email="wife@example.com", household_name="Other Household")

        # Act
        response = client.post(
            "/auth/invite",
            json={"name": "Wife", "email": "wife@example.com", "password": "secret456"},
            headers=headers,
        )

        # Assert
        assert response.status_code == 400

    def test_login__correct_credentials__returns_tokens(self, client, signup_tokens):
        # Arrange
        signup_tokens(email="yoav@example.com", password="secret123")

        # Act
        response = client.post(
            "/auth/login", json={"email": "yoav@example.com", "password": "secret123"}
        )

        # Assert
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_login__wrong_password__returns_401(self, client, signup_tokens):
        # Arrange
        signup_tokens(email="yoav@example.com", password="secret123")

        # Act
        response = client.post(
            "/auth/login", json={"email": "yoav@example.com", "password": "wrong-password"}
        )

        # Assert
        assert response.status_code == 401

    def test_login__email_not_registered__returns_401(self, client):
        # Arrange
        # (no signup)

        # Act
        response = client.post(
            "/auth/login", json={"email": "nobody@example.com", "password": "whatever"}
        )

        # Assert
        assert response.status_code == 401

    def test_refresh__valid_refresh_token__returns_new_tokens(self, client, signup_tokens):
        # Arrange
        tokens = signup_tokens()

        # Act
        response = client.post(
            "/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
        )

        # Assert
        assert response.status_code == 200
        assert "access_token" in response.json()

    def test_refresh__garbage_token__returns_401(self, client):
        # Arrange
        # (no setup needed)

        # Act
        response = client.post("/auth/refresh", json={"refresh_token": "not-a-real-token"})

        # Assert
        assert response.status_code == 401

    def test_refresh__access_token_used_as_refresh_token__returns_401(
        self, client, signup_tokens
    ):
        # Arrange
        tokens = signup_tokens()

        # Act
        response = client.post(
            "/auth/refresh", json={"refresh_token": tokens["access_token"]}
        )

        # Assert
        assert response.status_code == 401

    def test_refresh__valid_refresh_token_for_nonexistent_user__returns_401(self, client):
        # Arrange
        token = create_refresh_token(user_id=999999)

        # Act
        response = client.post("/auth/refresh", json={"refresh_token": token})

        # Assert
        assert response.status_code == 401
