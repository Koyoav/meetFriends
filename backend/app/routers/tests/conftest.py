import pytest


@pytest.fixture()
def signup_tokens(client):
    def _signup(
        email="yoav@example.com",
        household_name="Our Household",
        password="secret123",
        name="Yoav",
    ):
        response = client.post(
            "/auth/signup",
            json={
                "household_name": household_name,
                "name": name,
                "email": email,
                "password": password,
            },
        )
        assert response.status_code == 201, response.text
        return response.json()

    return _signup


@pytest.fixture()
def auth_headers(signup_tokens):
    def _auth_headers(**kwargs):
        tokens = signup_tokens(**kwargs)
        return {"Authorization": f"Bearer {tokens['access_token']}"}

    return _auth_headers
